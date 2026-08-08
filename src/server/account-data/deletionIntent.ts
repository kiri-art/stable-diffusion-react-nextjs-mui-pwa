import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const DELETION_INTENT_VERSION = 1 as const;

export interface DeletionIntentPayload {
  actorUserId: string;
  targetUserId: string;
  expiresAt: number;
  version: typeof DELETION_INTENT_VERSION;
}

export interface CreateDeletionIntentOptions {
  actorUserId: string;
  targetUserId: string;
  expiresAt: number;
  secret: string;
}

export interface VerifyDeletionIntentOptions {
  actorUserId: string;
  targetUserId: string;
  secret: string;
  now?: number;
}

export class DeletionIntentError extends Error {
  constructor(message = "Invalid account-deletion intent") {
    super(message);
    this.name = "DeletionIntentError";
  }
}

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const MAX_TOKEN_LENGTH = 4_096;

function assertNonEmptyString(value: string, name: string): void {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${name} must be a non-empty string`);
  }
}

function assertTimestamp(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${name} must be a non-negative integer timestamp`);
  }
}

function sign(encodedPayload: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(encodedPayload).digest();
}

function decodeBase64url(value: string): Buffer {
  if (!BASE64URL_PATTERN.test(value)) {
    throw new DeletionIntentError();
  }

  const decoded = Buffer.from(value, "base64url");
  if (decoded.length === 0 || decoded.toString("base64url") !== value) {
    throw new DeletionIntentError();
  }

  return decoded;
}

function timingSafeStringEqual(left: string, right: string): boolean {
  const leftDigest = createHash("sha256").update(left, "utf8").digest();
  const rightDigest = createHash("sha256").update(right, "utf8").digest();

  return timingSafeEqual(leftDigest, rightDigest);
}

function parsePayload(encodedPayload: string): DeletionIntentPayload {
  let parsed: unknown;

  try {
    parsed = JSON.parse(decodeBase64url(encodedPayload).toString("utf8"));
  } catch (error) {
    if (error instanceof DeletionIntentError) {
      throw error;
    }
    throw new DeletionIntentError();
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new DeletionIntentError();
  }

  const payload = parsed as Record<string, unknown>;
  const allowedKeys = new Set([
    "actorUserId",
    "targetUserId",
    "expiresAt",
    "version",
  ]);

  if (
    Object.keys(payload).length !== allowedKeys.size ||
    Object.keys(payload).some((key) => !allowedKeys.has(key)) ||
    payload.version !== DELETION_INTENT_VERSION ||
    typeof payload.actorUserId !== "string" ||
    payload.actorUserId.length === 0 ||
    typeof payload.targetUserId !== "string" ||
    payload.targetUserId.length === 0 ||
    typeof payload.expiresAt !== "number" ||
    !Number.isSafeInteger(payload.expiresAt) ||
    payload.expiresAt < 0
  ) {
    throw new DeletionIntentError();
  }

  return payload as unknown as DeletionIntentPayload;
}

export function createDeletionIntent({
  actorUserId,
  targetUserId,
  expiresAt,
  secret,
}: CreateDeletionIntentOptions): string {
  assertNonEmptyString(actorUserId, "actorUserId");
  assertNonEmptyString(targetUserId, "targetUserId");
  assertNonEmptyString(secret, "secret");
  assertTimestamp(expiresAt, "expiresAt");

  const payload: DeletionIntentPayload = {
    actorUserId,
    targetUserId,
    expiresAt,
    version: DELETION_INTENT_VERSION,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const signature = sign(encodedPayload, secret).toString("base64url");

  return `${encodedPayload}.${signature}`;
}

export function verifyDeletionIntent(
  token: string,
  {
    actorUserId,
    targetUserId,
    secret,
    now = Date.now(),
  }: VerifyDeletionIntentOptions,
): DeletionIntentPayload {
  assertNonEmptyString(actorUserId, "actorUserId");
  assertNonEmptyString(targetUserId, "targetUserId");
  assertNonEmptyString(secret, "secret");
  assertTimestamp(now, "now");

  if (
    typeof token !== "string" ||
    token.length === 0 ||
    token.length > MAX_TOKEN_LENGTH
  ) {
    throw new DeletionIntentError();
  }

  const parts = token.split(".");
  if (parts.length !== 2 || parts[0].length === 0 || parts[1].length === 0) {
    throw new DeletionIntentError();
  }

  const [encodedPayload, encodedSignature] = parts;
  const providedSignature = decodeBase64url(encodedSignature);
  const expectedSignature = sign(encodedPayload, secret);
  const comparableSignature = Buffer.alloc(expectedSignature.length);
  providedSignature.copy(comparableSignature, 0, 0, expectedSignature.length);
  const signatureMatches = timingSafeEqual(
    comparableSignature,
    expectedSignature,
  );

  if (
    !signatureMatches ||
    providedSignature.length !== expectedSignature.length
  ) {
    throw new DeletionIntentError();
  }

  const payload = parsePayload(encodedPayload);
  const actorMatches = timingSafeStringEqual(payload.actorUserId, actorUserId);
  const targetMatches = timingSafeStringEqual(
    payload.targetUserId,
    targetUserId,
  );

  if (!actorMatches || !targetMatches || payload.expiresAt <= now) {
    throw new DeletionIntentError();
  }

  return payload;
}
