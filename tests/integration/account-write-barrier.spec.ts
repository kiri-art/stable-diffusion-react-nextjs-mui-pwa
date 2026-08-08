import { ObjectId } from "mongodb";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  deleteAccountData,
  retryAccountDeletionJob,
} from "../../src/server/account-data";
import {
  AccountDeletionPendingError,
  acquireAccountWriteLease,
} from "../../src/server/account-data/writeBarrier";
import {
  startMongoReplicaSet,
  type TestMongoReplicaSet,
} from "../helpers/mongo-replica-set";

describe.sequential("account deletion write barrier", () => {
  let mongo: TestMongoReplicaSet;

  beforeAll(async () => {
    mongo = await startMongoReplicaSet();
  }, 30_000);

  afterAll(async () => {
    await mongo?.stop();
  }, 15_000);

  it("revokes access, waits for an existing writer, and sweeps its late data", async () => {
    const db = mongo.client.db("account-deletion-write-barrier");
    const targetUserId = new ObjectId();
    await db.collection("users").insertOne({
      _id: targetUserId,
      admin: false,
      emails: [{ value: "writer@example.test" }],
    });
    await db.collection("sessions").insertOne({
      _id: new ObjectId(),
      expires: new Date(Date.now() + 60_000),
      sessionToken: "active-before-deletion",
      userId: targetUserId,
    });

    const lease = await acquireAccountWriteLease({
      db,
      operation: "test-late-writer",
      targetUserId,
    });

    const pending = await deleteAccountData({
      client: mongo.client,
      db,
      targetUserId,
    });

    expect(pending).toMatchObject({
      deletionId: expect.any(String),
      status: "partial",
      targetUserId: targetUserId.toHexString(),
    });
    expect(pending.resources).toContainEqual(
      expect.objectContaining({
        action: "retained",
        affectedRows: 1,
        name: "account_writes",
      }),
    );
    expect(
      await db.collection("sessions").countDocuments({ userId: targetUserId }),
    ).toBe(0);
    expect(
      await db.collection("users").findOne({ _id: targetUserId }),
    ).toMatchObject({
      deletionId: new ObjectId(pending.deletionId),
      deletionPendingAt: expect.any(Date),
    });

    await expect(
      acquireAccountWriteLease({
        db,
        operation: "new-write-after-pending",
        targetUserId,
      }),
    ).rejects.toBeInstanceOf(AccountDeletionPendingError);

    await db.collection("userRequests").insertOne({
      _id: new ObjectId(),
      date: new Date(),
      userId: targetUserId,
    });
    await lease.release();

    const completed = await retryAccountDeletionJob({
      client: mongo.client,
      db,
      deletionId: pending.deletionId as string,
    });

    expect(completed.status).toBe("complete");
    expect(completed.collections).toContainEqual(
      expect.objectContaining({
        action: "deleted",
        affectedRows: 1,
        name: "userRequests",
      }),
    );
    expect(
      await db.collection("users").findOne({ _id: targetUserId }),
    ).toBeNull();
    expect(
      await db.collection("userRequests").countDocuments({
        userId: targetUserId,
      }),
    ).toBe(0);
    expect(await db.collection("accountDeletionJobs").countDocuments()).toBe(0);
  }, 30_000);
});
