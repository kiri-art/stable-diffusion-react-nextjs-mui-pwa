import { ObjectId } from "bson";
import type { Db } from "mongodb";

const DEFAULT_ACCOUNT_WRITE_LEASE_MS = 10 * 60 * 1_000;

interface AccountWriteLeaseDocument {
  _id: ObjectId;
  createdAt: Date;
  expiresAt: Date;
  operation: string;
}

interface AccountWriteUserDocument {
  _id: ObjectId | string;
  accountWriteLeases?: AccountWriteLeaseDocument[];
  deletionPendingAt?: Date;
}

export interface AcquireAccountWriteLeaseOptions {
  db: Db;
  leaseDurationMs?: number;
  operation: string;
  targetUserId: ObjectId | string;
}

export interface AccountWriteLease {
  expiresAt: Date;
  id: ObjectId;
  release: () => Promise<void>;
  renew: () => Promise<void>;
}

/** Raised when an account can no longer accept authenticated writes. */
export class AccountDeletionPendingError extends Error {
  constructor() {
    super("Account deletion is pending; new account writes are disabled");
    this.name = "AccountDeletionPendingError";
  }
}

function userIdValues(value: ObjectId | string): Array<ObjectId | string> {
  if (value instanceof ObjectId) return [value, value.toHexString()];
  if (!ObjectId.isValid(value)) throw new TypeError("Invalid user ID");
  return [new ObjectId(value), value];
}

export async function assertAccountWritable(
  db: Db,
  targetUserId: ObjectId | string,
): Promise<void> {
  const user = await db.collection<AccountWriteUserDocument>("users").findOne(
    {
      _id: { $in: userIdValues(targetUserId) },
      deletionPendingAt: { $exists: false },
    },
    { projection: { _id: 1 } },
  );
  if (!user) throw new AccountDeletionPendingError();
}

/**
 * Atomically registers an account-scoped writer on the user document. The
 * deletion-pending update targets the same document, so MongoDB defines a
 * strict before/after boundary between an existing writer and phase one.
 */
export async function acquireAccountWriteLease({
  db,
  leaseDurationMs = DEFAULT_ACCOUNT_WRITE_LEASE_MS,
  operation,
  targetUserId,
}: AcquireAccountWriteLeaseOptions): Promise<AccountWriteLease> {
  if (!Number.isFinite(leaseDurationMs) || leaseDurationMs <= 0) {
    throw new TypeError("Account write lease duration must be positive");
  }

  const id = new ObjectId();
  const createdAt = new Date();
  let expiresAt = new Date(createdAt.getTime() + leaseDurationMs);
  const lease: AccountWriteLeaseDocument = {
    _id: id,
    createdAt,
    expiresAt,
    operation,
  };
  const users = db.collection<AccountWriteUserDocument>("users");
  const user = await users.findOneAndUpdate(
    {
      _id: { $in: userIdValues(targetUserId) },
      deletionPendingAt: { $exists: false },
    },
    { $push: { accountWriteLeases: lease } },
    {
      includeResultMetadata: false,
      projection: { _id: 1 },
      returnDocument: "after",
    },
  );
  if (!user) throw new AccountDeletionPendingError();

  return {
    get expiresAt() {
      return expiresAt;
    },
    id,
    async release() {
      await users.updateOne(
        { _id: { $in: userIdValues(targetUserId) } },
        { $pull: { accountWriteLeases: { _id: id } } },
      );
    },
    async renew() {
      const renewedExpiry = new Date(Date.now() + leaseDurationMs);
      const result = await users.updateOne(
        {
          _id: { $in: userIdValues(targetUserId) },
          "accountWriteLeases._id": id,
        },
        {
          $set: {
            "accountWriteLeases.$[lease].expiresAt": renewedExpiry,
          },
        },
        { arrayFilters: [{ "lease._id": id }] },
      );
      if (!result.matchedCount) throw new AccountDeletionPendingError();
      expiresAt = renewedExpiry;
    },
  };
}

export async function withAccountWriteLease<T>(
  options: AcquireAccountWriteLeaseOptions,
  callback: (lease: AccountWriteLease) => Promise<T>,
): Promise<T> {
  const lease = await acquireAccountWriteLease(options);
  const leaseDurationMs =
    options.leaseDurationMs ?? DEFAULT_ACCOUNT_WRITE_LEASE_MS;
  const heartbeat = setInterval(
    () => {
      void lease.renew().catch((error) => {
        console.error("Account write lease renewal failed", error);
      });
    },
    Math.max(1_000, Math.floor(leaseDurationMs / 3)),
  );
  heartbeat.unref?.();

  try {
    return await callback(lease);
  } finally {
    clearInterval(heartbeat);
    await lease.release();
  }
}
