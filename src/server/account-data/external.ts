import AWS from "aws-sdk";
import Stripe from "stripe";

import type {
  AccountDataExternalServices,
  ExternalDeletionResult,
} from "./index";

const AWS_S3_BUCKET = "kiri-art";
const DEFAULT_AWS_REGION = "eu-west-3";
const S3_DELETE_OBJECTS_LIMIT = 1_000;

interface S3DeleteClient {
  deleteObjects(params: AWS.S3.DeleteObjectsRequest): {
    promise(): Promise<AWS.S3.DeleteObjectsOutput>;
  };
}

interface StripeDeleteClient {
  customers: {
    del(customerId: string): Promise<{ deleted?: boolean }>;
  };
}

interface S3ClientOptions {
  accessKeyId: string;
  region: string;
  secretAccessKey: string;
}

interface AccountDeletionEnvironment {
  [key: string]: string | undefined;
  AWS_ACCESS_KEY_ID?: string;
  AWS_ACCESS_KEY_ID_APP?: string;
  AWS_REGION?: string;
  AWS_REGION_APP?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  AWS_SECRET_ACCESS_KEY_APP?: string;
  STRIPE_SECRET_KEY?: string;
}

export interface CreateAccountDeletionExternalServicesOptions {
  createS3Client?: (options: S3ClientOptions) => S3DeleteClient;
  createStripeClient?: (secretKey: string) => StripeDeleteClient;
  env?: AccountDeletionEnvironment;
}

function nonEmpty(value: string | undefined): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function chunks<T>(values: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let offset = 0; offset < values.length; offset += size) {
    result.push(values.slice(offset, offset + size));
  }
  return result;
}

function isConvergedStripeDeletion(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as Record<string, unknown>;
  const raw =
    record.raw && typeof record.raw === "object"
      ? (record.raw as Record<string, unknown>)
      : undefined;
  return (
    record.code === "resource_missing" ||
    raw?.code === "resource_missing" ||
    (record.statusCode === 404 && record.type === "StripeInvalidRequestError")
  );
}

/**
 * Create production deletion adapters without constructing either SDK client
 * until its corresponding resource actually needs to be deleted.
 */
export function createAccountDeletionExternalServices({
  createS3Client = (options) => new AWS.S3(options),
  createStripeClient = (secretKey) => new Stripe(secretKey),
  env = process.env,
}: CreateAccountDeletionExternalServicesOptions = {}): AccountDataExternalServices {
  let s3: S3DeleteClient | undefined;
  let stripe: StripeDeleteClient | undefined;

  function getS3(): S3DeleteClient {
    if (s3) return s3;

    const accessKeyId = nonEmpty(
      env.AWS_ACCESS_KEY_ID_APP || env.AWS_ACCESS_KEY_ID,
    );
    const secretAccessKey = nonEmpty(
      env.AWS_SECRET_ACCESS_KEY_APP || env.AWS_SECRET_ACCESS_KEY,
    );
    if (!accessKeyId || !secretAccessKey) {
      throw new Error(
        "AWS credentials are not configured for account-data deletion",
      );
    }

    s3 = createS3Client({
      accessKeyId,
      secretAccessKey,
      region:
        nonEmpty(env.AWS_REGION_APP || env.AWS_REGION) || DEFAULT_AWS_REGION,
    });
    return s3;
  }

  function getStripe(): StripeDeleteClient {
    if (stripe) return stripe;

    const secretKey = nonEmpty(env.STRIPE_SECRET_KEY);
    if (!secretKey) {
      throw new Error(
        "STRIPE_SECRET_KEY is not configured for account-data deletion",
      );
    }

    stripe = createStripeClient(secretKey);
    return stripe;
  }

  async function deleteS3Objects(
    keys: string[],
  ): Promise<ExternalDeletionResult> {
    const uniqueKeys = Array.from(
      new Set(keys.filter((key) => typeof key === "string" && key.length > 0)),
    );
    if (uniqueKeys.length === 0) return { affectedRows: 0 };

    const client = getS3();
    let affectedRows = 0;
    const failed: string[] = [];

    for (const keyChunk of chunks(uniqueKeys, S3_DELETE_OBJECTS_LIMIT)) {
      try {
        const result = await client
          .deleteObjects({
            Bucket: AWS_S3_BUCKET,
            Delete: {
              Objects: keyChunk.map((Key) => ({ Key })),
              Quiet: false,
            },
          })
          .promise();
        const errors = result.Errors || [];
        const failedKeys = new Set(
          errors.map(
            (entry, index) =>
              entry.Key || `unknown-s3-object-in-chunk-${index + 1}`,
          ),
        );

        failed.push(...failedKeys);
        affectedRows +=
          result.Deleted?.length ??
          Math.max(0, keyChunk.length - errors.length);
      } catch {
        // Preserve partial progress across chunks and let the account-data
        // service report each object in this failed request as retryable.
        failed.push(...keyChunk);
      }
    }

    return {
      affectedRows,
      ...(failed.length ? { failed: Array.from(new Set(failed)) } : {}),
    };
  }

  async function deleteStripeCustomer(
    customerId: string,
  ): Promise<ExternalDeletionResult> {
    if (typeof customerId !== "string" || customerId.length === 0) {
      throw new TypeError("Stripe customer ID must be a non-empty string");
    }

    try {
      const result = await getStripe().customers.del(customerId);
      return result.deleted
        ? { affectedRows: 1 }
        : { affectedRows: 0, failed: [customerId] };
    } catch (error) {
      // Replaying an outbox job after a crash can reach Stripe after the first
      // delete already converged. A missing customer therefore means success.
      if (isConvergedStripeDeletion(error)) return { affectedRows: 1 };
      throw error;
    }
  }

  return { deleteS3Objects, deleteStripeCustomer };
}
