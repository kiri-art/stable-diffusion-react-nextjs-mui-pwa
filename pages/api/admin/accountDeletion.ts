import { type Db, type Document, ObjectId, type WithId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import gs from "../../../src/api-lib/db-full";
import {
  RequestAuthError,
  requireAdminUser,
} from "../../../src/api-lib/requestAuth";
import {
  AccountDeletionConfigurationError,
  AccountDeletionJobNotFoundError,
  deleteAccountData,
  LastAdminDeletionError,
  previewAccountDeletion,
  retryAccountDeletionJob,
} from "../../../src/server/account-data";
import {
  createDeletionIntent,
  DeletionIntentError,
  verifyDeletionIntent,
} from "../../../src/server/account-data/deletionIntent";
import { createAccountDeletionExternalServices } from "../../../src/server/account-data/external";

const ACTION_HEADER = "x-kiri-account-action";
const INTENT_LIFETIME_MS = 5 * 60 * 1_000;
const MAX_SEARCH_RESULTS = 10;
const MAX_SEARCH_QUERY_LENGTH = 320;

interface AccountIdentity {
  admin: boolean;
  createdAt: string | null;
  displayName: string | null;
  email: string | null;
  id: string;
}

interface UserDocument extends Document {
  admin?: boolean;
  createdAt?: Date | string;
  displayName?: string;
  email?: string;
  emails?: Array<{ value?: string }>;
}

class AccountDeletionRequestError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AccountDeletionRequestError";
  }
}

function sendError(
  res: NextApiResponse,
  status: number,
  code: string,
  message: string,
) {
  return res.status(status).json({ error: { code, message } });
}

function bodyRecord(req: NextApiRequest): Record<string, unknown> {
  if (
    typeof req.body !== "object" ||
    req.body === null ||
    Array.isArray(req.body)
  ) {
    throw new AccountDeletionRequestError(
      400,
      "INVALID_REQUEST",
      "A JSON request body is required",
    );
  }
  return req.body as Record<string, unknown>;
}

function targetObjectId(value: unknown): ObjectId {
  if (typeof value !== "string" || !ObjectId.isValid(value)) {
    throw new AccountDeletionRequestError(
      400,
      "INVALID_TARGET_USER_ID",
      "A valid target user ID is required",
    );
  }
  return new ObjectId(value);
}

function deletionJobObjectId(value: unknown): ObjectId {
  if (typeof value !== "string" || !ObjectId.isValid(value)) {
    throw new AccountDeletionRequestError(
      400,
      "INVALID_DELETION_ID",
      "A valid deletion job ID is required",
    );
  }
  return new ObjectId(value);
}

function emailFromUser(user: UserDocument, preferred?: string): string | null {
  const emails = Array.isArray(user.emails)
    ? user.emails
        .map((entry) => entry?.value)
        .filter((value): value is string => typeof value === "string")
    : [];
  if (preferred) {
    const preferredEmail = emails.find(
      (email) => email.toLocaleLowerCase() === preferred.toLocaleLowerCase(),
    );
    if (preferredEmail) return preferredEmail;
  }
  if (emails[0]) return emails[0];
  return typeof user.email === "string" ? user.email : null;
}

function accountIdentity(
  user: WithId<UserDocument>,
  preferredEmail?: string,
): AccountIdentity {
  const createdAt =
    user.createdAt instanceof Date
      ? user.createdAt.toISOString()
      : typeof user.createdAt === "string"
        ? user.createdAt
        : null;

  return {
    id: user._id.toHexString(),
    email: emailFromUser(user, preferredEmail),
    displayName: typeof user.displayName === "string" ? user.displayName : null,
    createdAt,
    admin: user.admin === true,
  };
}

function userProjection() {
  return {
    _id: 1,
    admin: 1,
    createdAt: 1,
    displayName: 1,
    email: 1,
    "emails.value": 1,
  } as const;
}

async function findTarget(
  db: Db,
  targetUserId: ObjectId,
): Promise<WithId<UserDocument> | null> {
  return db
    .collection<UserDocument>("users")
    .findOne({ _id: targetUserId }, { projection: userProjection() });
}

async function assertDeletableTarget(
  db: Db,
  actorUserId: ObjectId,
  targetUserId: ObjectId,
): Promise<WithId<UserDocument>> {
  if (actorUserId.equals(targetUserId)) {
    throw new AccountDeletionRequestError(
      409,
      "SELF_DELETION_NOT_ALLOWED",
      "Use the self-service account deletion flow to delete your own account",
    );
  }

  const target = await findTarget(db, targetUserId);
  if (!target) {
    throw new AccountDeletionRequestError(
      404,
      "ACCOUNT_NOT_FOUND",
      "No user exists with that ID",
    );
  }
  if (
    target.admin &&
    (await db.collection("users").countDocuments({ admin: true })) <= 1
  ) {
    throw new AccountDeletionRequestError(
      409,
      "LAST_ADMIN",
      "The final administrator account cannot be deleted",
    );
  }

  return target;
}

function deletionSecret(): string {
  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new AccountDeletionRequestError(
      500,
      "SERVER_CONFIGURATION_ERROR",
      "NEXTAUTH_SECRET is not configured for account deletion",
    );
  }
  return secret;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function searchUsers(db: Db, rawQuery: unknown) {
  if (typeof rawQuery !== "string" || rawQuery.trim().length === 0) {
    throw new AccountDeletionRequestError(
      400,
      "SEARCH_QUERY_REQUIRED",
      "Enter an exact email address or user ID",
    );
  }

  const query = rawQuery.trim();
  if (query.length > MAX_SEARCH_QUERY_LENGTH) {
    throw new AccountDeletionRequestError(
      400,
      "SEARCH_QUERY_TOO_LONG",
      `Search queries cannot exceed ${MAX_SEARCH_QUERY_LENGTH} characters`,
    );
  }
  const users = db.collection<UserDocument>("users");
  let matches: WithId<UserDocument>[];

  if (ObjectId.isValid(query)) {
    const match = await users.findOne(
      { _id: new ObjectId(query) },
      { projection: userProjection() },
    );
    matches = match ? [match] : [];
  } else {
    const exactEmail = new RegExp(`^${escapeRegex(query)}$`, "i");
    matches = await users
      .find(
        { $or: [{ "emails.value": exactEmail }, { email: exactEmail }] },
        { projection: userProjection() },
      )
      .limit(MAX_SEARCH_RESULTS)
      .toArray();
  }

  return {
    results: matches.map((user) => accountIdentity(user, query)),
  };
}

async function previewDeletion(
  db: Db,
  actorUserId: ObjectId,
  rawTargetUserId: unknown,
) {
  const targetUserId = targetObjectId(rawTargetUserId);
  const target = await assertDeletableTarget(db, actorUserId, targetUserId);
  const preview = await previewAccountDeletion({ db, targetUserId });
  if (preview.status === "not_found") {
    throw new AccountDeletionRequestError(
      404,
      "ACCOUNT_NOT_FOUND",
      "No user exists with that ID",
    );
  }

  return {
    target: accountIdentity(target),
    preview,
    intent: createDeletionIntent({
      actorUserId: actorUserId.toHexString(),
      targetUserId: targetUserId.toHexString(),
      expiresAt: Date.now() + INTENT_LIFETIME_MS,
      secret: deletionSecret(),
    }),
  };
}

async function executeDeletion(
  req: NextApiRequest,
  db: Db,
  actorUserId: ObjectId,
  body: Record<string, unknown>,
) {
  if (req.headers[ACTION_HEADER] !== "admin-delete") {
    throw new AccountDeletionRequestError(
      400,
      "ACTION_HEADER_REQUIRED",
      `The ${ACTION_HEADER} header must be set to admin-delete`,
    );
  }

  const targetUserId = targetObjectId(body.targetUserId);
  const canonicalTargetUserId = targetUserId.toHexString();
  if (body.confirmation !== `DELETE ${canonicalTargetUserId}`) {
    throw new AccountDeletionRequestError(
      400,
      "CONFIRMATION_REQUIRED",
      "The account-deletion confirmation did not match the target user ID",
    );
  }
  if (typeof body.intent !== "string") {
    throw new AccountDeletionRequestError(
      400,
      "INVALID_INTENT",
      "A valid account-deletion intent is required",
    );
  }

  try {
    verifyDeletionIntent(body.intent, {
      actorUserId: actorUserId.toHexString(),
      targetUserId: canonicalTargetUserId,
      secret: deletionSecret(),
    });
  } catch (error) {
    if (!(error instanceof DeletionIntentError)) throw error;
    throw new AccountDeletionRequestError(
      400,
      "INVALID_INTENT",
      "The account-deletion intent is invalid or expired",
    );
  }

  // Re-read the target and administrator count after confirmation and intent
  // validation so an old preview cannot bypass current safety checks.
  await assertDeletableTarget(db, actorUserId, targetUserId);
  const report = await deleteAccountData({
    db,
    client: gs.dba.client,
    targetUserId,
    external: createAccountDeletionExternalServices(),
  });
  if (report.status === "not_found") {
    throw new AccountDeletionRequestError(
      404,
      "ACCOUNT_NOT_FOUND",
      "No user exists with that ID",
    );
  }
  return report;
}

async function retryDeletion(
  req: NextApiRequest,
  db: Db,
  body: Record<string, unknown>,
) {
  if (req.headers[ACTION_HEADER] !== "admin-delete-retry") {
    throw new AccountDeletionRequestError(
      400,
      "ACTION_HEADER_REQUIRED",
      `The ${ACTION_HEADER} header must be set to admin-delete-retry`,
    );
  }

  const deletionId = deletionJobObjectId(body.deletionId);
  const canonicalDeletionId = deletionId.toHexString();
  if (body.confirmation !== `RETRY ${canonicalDeletionId}`) {
    throw new AccountDeletionRequestError(
      400,
      "CONFIRMATION_REQUIRED",
      "The retry confirmation did not match the deletion job ID",
    );
  }

  return retryAccountDeletionJob({
    db,
    deletionId,
    external: createAccountDeletionExternalServices(),
  });
}

export default async function accountDeletion(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  res.setHeader("Cache-Control", "no-store");

  try {
    // Authenticate before dispatching any action so this endpoint never
    // exposes method or validation behavior to a non-administrator.
    const actor = await requireAdminUser(req, res);
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return sendError(res, 405, "METHOD_NOT_ALLOWED", "Only POST is allowed");
    }

    const body = bodyRecord(req);
    const db = await gs.dba.dbPromise;
    const actorUserId = actor._id;

    switch (body.action) {
      case "search":
        return res.status(200).json(await searchUsers(db, body.query));
      case "preview":
        return res
          .status(200)
          .json(await previewDeletion(db, actorUserId, body.targetUserId));
      case "delete":
        return res
          .status(200)
          .json(await executeDeletion(req, db, actorUserId, body));
      case "retry":
        return res.status(200).json(await retryDeletion(req, db, body));
      default:
        return sendError(
          res,
          400,
          "INVALID_ACTION",
          "Action must be search, preview, delete, or retry",
        );
    }
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return sendError(
        res,
        error.statusCode,
        error.statusCode === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
        error.message,
      );
    }
    if (error instanceof LastAdminDeletionError) {
      return sendError(res, 409, "LAST_ADMIN", error.message);
    }
    if (error instanceof AccountDeletionConfigurationError) {
      return sendError(
        res,
        503,
        "ACCOUNT_DELETION_UNAVAILABLE",
        "Account deletion is temporarily unavailable",
      );
    }
    if (error instanceof AccountDeletionJobNotFoundError) {
      return sendError(
        res,
        404,
        "DELETION_JOB_NOT_FOUND",
        "No pending account-deletion job exists with that ID",
      );
    }
    if (error instanceof AccountDeletionRequestError) {
      return sendError(res, error.statusCode, error.code, error.message);
    }

    console.error("Administrative account deletion failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return sendError(
      res,
      500,
      "ACCOUNT_DELETION_FAILED",
      "Account deletion failed",
    );
  }
}
