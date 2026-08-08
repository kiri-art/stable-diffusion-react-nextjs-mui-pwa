import { type Db, type MongoClient, ObjectId } from "mongodb";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import {
  AccountDeletionConfigurationError,
  AccountDeletionJobNotFoundError,
  deleteAccountData,
  LastAdminDeletionError,
  previewAccountDeletion,
  recheckS3DeletionKeys,
  retryAccountDeletionJob,
} from "../../src/server/account-data";
import { isDeletedCallbackIdentifier } from "../../src/server/account-data/requestTombstone";
import {
  startMongoReplicaSet,
  type TestMongoReplicaSet,
} from "../helpers/mongo-replica-set";

type ReportAction =
  | "anonymized"
  | "deleted"
  | "failed"
  | "retained"
  | "skipped_shared"
  | "updated";

interface ReportEntry {
  action: ReportAction;
  affectedRows: number;
  name: string;
  reason?: string;
}

const ids = {
  adminUser: new ObjectId("64b000000000000000000001"),
  controlUser: new ObjectId("64b000000000000000000002"),
  targetUser: new ObjectId("64b000000000000000000003"),
  targetStarA: new ObjectId("64b000000000000000000011"),
  targetStarB: new ObjectId("64b000000000000000000012"),
  survivorStar: new ObjectId("64b000000000000000000013"),
  legacySurvivorStar: new ObjectId("64b000000000000000000014"),
  targetFileOnly: new ObjectId("64b000000000000000000021"),
  targetFileShared: new ObjectId("64b000000000000000000022"),
  targetFileDirect: new ObjectId("64b000000000000000000023"),
  controlFileShared: new ObjectId("64b000000000000000000024"),
  controlFileDirect: new ObjectId("64b000000000000000000025"),
  foreignOwnedFile: new ObjectId("64b000000000000000000026"),
  targetOrderA: new ObjectId("64b000000000000000000031"),
  targetOrderB: new ObjectId("64b000000000000000000032"),
  controlOrder: new ObjectId("64b000000000000000000033"),
};

const requestIds = {
  control: "request-control-1",
  shared: "request-shared-collision",
  targetA: "request-target-1",
  targetB: "request-target-2",
  targetC: "request-target-3",
};

const expectedCollections: ReportEntry[] = [
  { name: "accounts", action: "deleted", affectedRows: 2 },
  {
    name: "accountDeletionCallbackTombstones",
    action: "retained",
    affectedRows: 3,
  },
  { name: "bananaRequests", action: "deleted", affectedRows: 3 },
  { name: "bananaRequests", action: "skipped_shared", affectedRows: 1 },
  { name: "csends", action: "deleted", affectedRows: 4 },
  { name: "csends", action: "skipped_shared", affectedRows: 1 },
  { name: "files", action: "deleted", affectedRows: 2 },
  { name: "files", action: "skipped_shared", affectedRows: 2 },
  { name: "files", action: "updated", affectedRows: 1 },
  { name: "likes", action: "deleted", affectedRows: 3 },
  { name: "orders", action: "anonymized", affectedRows: 2 },
  { name: "reportedStars", action: "deleted", affectedRows: 3 },
  { name: "sessions", action: "deleted", affectedRows: 2 },
  { name: "stars", action: "deleted", affectedRows: 2 },
  { name: "stars", action: "updated", affectedRows: 1 },
  { name: "statsDaily", action: "updated", affectedRows: 2 },
  { name: "userRequests", action: "deleted", affectedRows: 3 },
  { name: "users", action: "deleted", affectedRows: 1 },
  { name: "verification_tokens", action: "deleted", affectedRows: 1 },
  {
    name: "verification_tokens",
    action: "skipped_shared",
    affectedRows: 3,
  },
];

const expectedResources: ReportEntry[] = [
  { name: "s3", action: "deleted", affectedRows: 2 },
  { name: "s3", action: "skipped_shared", affectedRows: 2 },
  { name: "stripe", action: "deleted", affectedRows: 0 },
  { name: "stripe", action: "skipped_shared", affectedRows: 1 },
];

function reportEntries(entries: readonly ReportEntry[]) {
  return entries
    .map(({ action, affectedRows, name }) => ({ action, affectedRows, name }))
    .sort((left, right) =>
      `${left.name}:${left.action}`.localeCompare(
        `${right.name}:${right.action}`,
      ),
    );
}

async function seedAccountGraph(db: Db) {
  const createdAt = new Date("2026-01-02T03:04:05.000Z");

  await Promise.all([
    db.collection("users").insertMany([
      {
        _id: ids.targetUser,
        admin: false,
        createdAt,
        credits: { free: 1, paid: 2 },
        displayName: "Delete Me",
        emails: [
          { value: "delete-me@example.test", verified: true },
          { value: "target-only@example.test", verified: true },
        ],
        stripeCustomerId: "cus_delete_me",
      },
      {
        _id: ids.adminUser,
        admin: true,
        createdAt,
        displayName: "Admin",
        emails: [{ value: "admin@example.test", verified: true }],
      },
      {
        _id: ids.controlUser,
        admin: false,
        createdAt,
        displayName: "Keep Me",
        emails: [
          { value: "keep-me@example.test", verified: true },
          { value: "DELETE-ME@example.test", verified: true },
        ],
        stripeCustomerId: "cus_delete_me",
      },
    ]),
    db.collection("accounts").insertMany([
      {
        _id: new ObjectId(),
        provider: "github",
        providerAccountId: "target-github",
        userId: ids.targetUser,
      },
      {
        _id: new ObjectId(),
        provider: "google",
        providerAccountId: "target-google",
        userId: ids.targetUser,
      },
      {
        _id: new ObjectId(),
        provider: "github",
        providerAccountId: "control-github",
        userId: ids.controlUser,
      },
      {
        _id: new ObjectId(),
        strategy: "global-auth-strategy",
      },
    ]),
    db
      .collection<{ _id: ObjectId | string; [key: string]: unknown }>(
        "sessions",
      )
      .insertMany([
        {
          _id: "legacy-target-session",
          expires: new Date("2030-01-01T00:00:00.000Z"),
          userId: ids.targetUser,
        },
        {
          _id: new ObjectId(),
          expires: new Date("2030-01-01T00:00:00.000Z"),
          sessionToken: "target-session-token",
          userId: ids.targetUser,
        },
        {
          _id: new ObjectId(),
          expires: new Date("2030-01-01T00:00:00.000Z"),
          sessionToken: "control-session-token",
          userId: ids.controlUser,
        },
      ]),
    db.collection("orders").insertMany([
      {
        _id: ids.targetOrderA,
        amount: 300,
        createdAt,
        currency: "usd",
        numCredits: 100,
        stripePaymentIntentId: "pi_target_a",
        stripePaymentIntentStatus: "succeeded",
        userId: ids.targetUser,
      },
      {
        _id: ids.targetOrderB,
        amount: 1_000,
        createdAt,
        currency: "usd",
        numCredits: 500,
        stripePaymentIntentId: "pi_target_b",
        stripePaymentIntentStatus: "succeeded",
        userId: ids.targetUser,
      },
      {
        _id: ids.controlOrder,
        amount: 300,
        createdAt,
        currency: "usd",
        numCredits: 100,
        stripePaymentIntentId: "pi_control",
        stripePaymentIntentStatus: "succeeded",
        userId: ids.controlUser,
      },
    ]),
    db.collection("verification_tokens").insertMany([
      {
        _id: new ObjectId(),
        expires: new Date("2030-01-01T00:00:00.000Z"),
        identifier: "delete-me@example.test",
        token: "target-verification-token",
      },
      {
        _id: new ObjectId(),
        email: "delete-me@example.test",
        expires: new Date("2030-01-01T00:00:00.000Z"),
        token: "target-legacy-verification-token",
      },
      {
        _id: new ObjectId(),
        expires: new Date("2030-01-01T00:00:00.000Z"),
        identifier: "target-only@example.test",
        token: "target-only-verification-token",
      },
      {
        _id: new ObjectId(),
        email: "target-only@example.test",
        expires: new Date("2030-01-01T00:00:00.000Z"),
        identifier: "delete-me@example.test",
        token: "shared-identifier-wins",
      },
      {
        _id: new ObjectId(),
        expires: new Date("2030-01-01T00:00:00.000Z"),
        identifier: "keep-me@example.test",
        token: "control-verification-token",
      },
    ]),
    db.collection("userRequests").insertMany([
      {
        _id: new ObjectId(),
        date: createdAt,
        startRequestId: requestIds.targetA,
        userId: ids.targetUser,
      },
      {
        _id: new ObjectId(),
        callInputs: { startRequestId: requestIds.targetC },
        date: createdAt,
        startRequestId: requestIds.targetB,
        userId: ids.targetUser,
      },
      {
        _id: new ObjectId(),
        date: createdAt,
        startRequestId: requestIds.shared,
        userId: ids.targetUser,
      },
      {
        _id: new ObjectId(),
        callInputs: { startRequestId: requestIds.shared },
        date: createdAt,
        startRequestId: requestIds.control,
        userId: ids.controlUser,
      },
    ]),
    db.collection("bananaRequests").insertMany([
      {
        _id: new ObjectId(),
        createdAt,
        modelInputs: { prompt: "private target prompt one" },
        startRequestId: requestIds.targetA,
      },
      {
        _id: new ObjectId(),
        createdAt,
        modelInputs: { prompt: "private target prompt two" },
        startRequestId: requestIds.targetB,
      },
      {
        _id: new ObjectId(),
        createdAt,
        modelInputs: { prompt: "private target prompt three" },
        startRequestId: requestIds.targetC,
      },
      {
        _id: new ObjectId(),
        createdAt,
        modelInputs: { prompt: "ambiguous shared prompt" },
        startRequestId: requestIds.shared,
      },
      {
        _id: new ObjectId(),
        createdAt,
        modelInputs: { prompt: "control prompt" },
        startRequestId: requestIds.control,
      },
    ]),
    db.collection("csends").insertMany([
      {
        _id: new ObjectId(),
        container_id: "target-container-a",
        payload: { startRequestId: requestIds.targetA },
        status: "start",
        type: "inference",
      },
      {
        _id: new ObjectId(),
        container_id: "target-container-a",
        payload: {},
        status: "done",
        type: "inference",
      },
      {
        _id: new ObjectId(),
        container_id: "target-container-b",
        payload: { startRequestId: requestIds.targetB },
        status: "start",
        type: "inference",
      },
      {
        _id: new ObjectId(),
        container_id: "target-container-c",
        payload: { startRequestId: requestIds.targetC },
        status: "start",
        type: "inference",
      },
      {
        _id: new ObjectId(),
        container_id: "shared-container",
        payload: { startRequestId: requestIds.shared },
        status: "start",
        type: "inference",
      },
      {
        _id: new ObjectId(),
        container_id: "control-container",
        payload: { startRequestId: requestIds.control },
        status: "start",
        type: "inference",
      },
    ]),
    db.collection("stars").insertMany([
      {
        _id: ids.targetStarA,
        files: {
          init: ids.foreignOwnedFile,
          output: ids.targetFileOnly,
        },
        likes: 2,
        reports: 1,
        userId: ids.targetUser,
      },
      {
        _id: ids.targetStarB,
        files: { output: ids.targetFileShared },
        likes: 0,
        reports: 1,
        userId: ids.targetUser,
      },
      {
        _id: ids.survivorStar,
        files: { output: ids.controlFileShared },
        likes: 2,
        reports: 2,
        userId: ids.controlUser,
      },
      {
        _id: ids.legacySurvivorStar,
        files: {
          legacy: { gallery: [{ file: ids.targetFileShared }] },
        },
        likes: 0,
        reports: 0,
        userId: ids.controlUser,
      },
    ]),
    db.collection("likes").insertMany([
      {
        _id: new ObjectId(),
        liked: true,
        starId: ids.survivorStar,
        userId: ids.targetUser,
      },
      {
        _id: new ObjectId(),
        liked: true,
        starId: ids.targetStarA,
        userId: ids.targetUser,
      },
      {
        _id: new ObjectId(),
        liked: true,
        starId: ids.targetStarA,
        userId: ids.controlUser,
      },
      {
        _id: new ObjectId(),
        liked: true,
        starId: ids.survivorStar,
        userId: ids.controlUser,
      },
    ]),
    db.collection("reportedStars").insertMany([
      {
        _id: new ObjectId(),
        starId: ids.survivorStar,
        userId: ids.targetUser,
      },
      {
        _id: new ObjectId(),
        starId: ids.targetStarA,
        userId: ids.controlUser,
      },
      {
        _id: new ObjectId(),
        starId: ids.targetStarB,
        userId: ids.adminUser,
      },
      {
        _id: new ObjectId(),
        starId: ids.survivorStar,
        userId: ids.controlUser,
      },
    ]),
    db.collection("files").insertMany([
      {
        _id: ids.targetFileOnly,
        sha256: "sha-star-target-only",
        size: 101,
        type: "image",
      },
      {
        _id: ids.targetFileShared,
        sha256: "sha-shared",
        size: 102,
        type: "image",
        userId: ids.targetUser,
      },
      {
        _id: ids.targetFileDirect,
        sha256: "sha-direct-target-only",
        size: 103,
        type: "image",
        userId: ids.targetUser,
      },
      {
        _id: ids.controlFileShared,
        sha256: "sha-shared",
        size: 102,
        type: "image",
      },
      {
        _id: ids.controlFileDirect,
        sha256: "sha-control-only",
        size: 104,
        type: "image",
        userId: ids.controlUser,
      },
      {
        _id: ids.foreignOwnedFile,
        sha256: "sha-foreign-owned",
        size: 105,
        type: "image",
        userId: ids.controlUser,
      },
    ]),
    db.collection("statsDaily").insertMany([
      {
        _id: new ObjectId(),
        date: new Date("2026-01-01T00:00:00.000Z"),
        requestsByUser: [
          { requests: 3, userId: ids.targetUser },
          { requests: 7, userId: ids.controlUser },
        ],
        totalRequests: 10,
      },
      {
        _id: new ObjectId(),
        date: new Date("2026-01-02T00:00:00.000Z"),
        requestsByUser: [
          { requests: 1, userId: ids.targetUser },
          { requests: 2, userId: ids.adminUser },
        ],
        totalRequests: 13,
      },
      {
        _id: new ObjectId(),
        date: new Date("2026-01-03T00:00:00.000Z"),
        requestsByUser: [{ requests: 8, userId: ids.controlUser }],
        totalRequests: 21,
      },
    ]),
    db.collection("statsHourly").insertOne({
      _id: new ObjectId(),
      date: createdAt,
      total: 42,
    }),
    db.collection("creditCodes").insertOne({
      _id: new ObjectId(),
      credits: 10,
      name: "GLOBAL-CODE",
      total: 100,
      used: 2,
    }),
    db.collection("bananaCapacity").insertOne({
      _id: new ObjectId(),
      capacity: 7,
      date: createdAt,
    }),
  ]);
}

describe.sequential("account data deletion", () => {
  let mongo: TestMongoReplicaSet;

  beforeAll(async () => {
    mongo = await startMongoReplicaSet();
    await seedAccountGraph(mongo.db);
  }, 30_000);

  afterAll(async () => {
    await mongo?.stop();
  }, 15_000);

  it("refuses a standalone MongoDB topology before making deletion writes", async () => {
    const command = vi.fn(async () => ({ isWritablePrimary: true, ok: 1 }));
    const standaloneClient = {
      db: vi.fn(() => ({ command })),
    } as unknown as MongoClient;
    const guardBefore = await mongo.db
      .collection("accountDataGuards")
      .countDocuments();

    await expect(
      deleteAccountData({
        client: standaloneClient,
        db: mongo.db,
        targetUserId: ids.targetUser,
      }),
    ).rejects.toBeInstanceOf(AccountDeletionConfigurationError);

    expect(command).toHaveBeenCalledExactlyOnceWith({ hello: 1 });
    expect(
      await mongo.db.collection("accountDataGuards").countDocuments(),
    ).toBe(guardBefore);
  });

  it("keeps a failed final sweep pending and resumes it without partial graph deletion", async () => {
    const external = {
      deleteS3Objects: vi.fn(async (keys: string[]) => ({
        affectedRows: keys.length,
      })),
      deleteStripeCustomer: vi.fn(async (_customerId: string) => ({
        affectedRows: 1,
      })),
    };

    await mongo.db.command({
      collMod: "orders",
      validationAction: "error",
      validationLevel: "strict",
      validator: { accountDeletedAt: { $exists: false } },
    });

    let pending!: Awaited<ReturnType<typeof deleteAccountData>>;
    try {
      pending = await deleteAccountData({
        client: mongo.client,
        db: mongo.db,
        external,
        targetUserId: ids.targetUser,
      });
    } finally {
      await mongo.db.command({
        collMod: "orders",
        validationAction: "error",
        validationLevel: "strict",
        validator: {},
      });
    }

    expect(pending).toMatchObject({
      deletionId: expect.any(String),
      status: "partial",
    });

    expect(
      await mongo.db.collection("users").findOne({ _id: ids.targetUser }),
    ).toMatchObject({
      deletionId: new ObjectId(pending.deletionId),
      deletionPendingAt: expect.any(Date),
    });
    expect(
      await mongo.db.collection("stars").countDocuments({
        _id: { $in: [ids.targetStarA, ids.targetStarB] },
      }),
    ).toBe(2);
    expect(
      await mongo.db.collection("likes").countDocuments({
        $or: [
          { userId: ids.targetUser },
          { starId: { $in: [ids.targetStarA, ids.targetStarB] } },
        ],
      }),
    ).toBe(3);
    expect(
      await mongo.db.collection("stars").findOne({ _id: ids.survivorStar }),
    ).toMatchObject({ likes: 2, reports: 2 });
    expect(
      await mongo.db.collection("orders").findOne({ _id: ids.targetOrderA }),
    ).not.toHaveProperty("accountDeletedAt");
    expect(external.deleteS3Objects).not.toHaveBeenCalled();
    expect(external.deleteStripeCustomer).not.toHaveBeenCalled();
    expect(
      await mongo.db.collection("accountDeletionJobs").countDocuments(),
    ).toBe(1);

    const completed = await retryAccountDeletionJob({
      client: mongo.client,
      db: mongo.db,
      deletionId: pending.deletionId as string,
      external,
    });
    expect(completed.status).toBe("complete");
    expect(
      await mongo.db.collection("users").findOne({ _id: ids.targetUser }),
    ).toBeNull();

    await mongo.db.dropDatabase();
    await seedAccountGraph(mongo.db);
  }, 30_000);

  it("previews and deletes the complete account graph without harming shared data", async () => {
    const preview = await previewAccountDeletion({
      db: mongo.db,
      targetUserId: ids.targetUser,
    });

    expect(preview.status).toBe("complete");
    expect(preview.targetUserId).toBe(ids.targetUser.toHexString());
    expect(reportEntries(preview.collections)).toEqual(
      reportEntries(expectedCollections),
    );
    expect(reportEntries(preview.resources)).toEqual(
      reportEntries(expectedResources),
    );
    expect(
      await mongo.db.collection("users").findOne({ _id: ids.targetUser }),
    ).not.toBeNull();

    const external = {
      deleteS3Objects: vi.fn(async (keys: string[]) => ({
        affectedRows: keys.length,
      })),
      deleteStripeCustomer: vi.fn(async (_customerId: string) => ({
        affectedRows: 1,
      })),
    };

    const report = await deleteAccountData({
      client: mongo.client,
      db: mongo.db,
      external,
      targetUserId: ids.targetUser,
    });

    expect(report.status).toBe("complete");
    expect(report.targetUserId).toBe(ids.targetUser.toHexString());
    expect(reportEntries(report.collections)).toEqual(
      reportEntries(expectedCollections),
    );
    expect(reportEntries(report.resources)).toEqual(
      reportEntries(expectedResources),
    );
    expect(
      report.resources.find(
        (entry: ReportEntry) => entry.action === "skipped_shared",
      )?.reason,
    ).toEqual(expect.any(String));

    expect(external.deleteS3Objects).toHaveBeenCalledOnce();
    expect(external.deleteS3Objects.mock.calls[0]?.[0].toSorted()).toEqual([
      "sha-direct-target-only",
      "sha-star-target-only",
    ]);
    expect(external.deleteStripeCustomer).not.toHaveBeenCalled();
    expect(
      await mongo.db.collection("accountDeletionJobs").countDocuments(),
    ).toBe(0);

    const db = mongo.db;
    expect(
      await db.collection("users").findOne({ _id: ids.targetUser }),
    ).toBeNull();
    await expect(
      isDeletedCallbackIdentifier(db, "request", requestIds.targetA),
    ).resolves.toBe(true);
    await expect(
      isDeletedCallbackIdentifier(db, "request", requestIds.shared),
    ).resolves.toBe(false);
    expect(await db.collection("users").countDocuments()).toBe(2);
    expect(
      await db
        .collection("accounts")
        .countDocuments({ userId: ids.targetUser }),
    ).toBe(0);
    expect(
      await db.collection("accounts").findOne({
        strategy: "global-auth-strategy",
      }),
    ).not.toBeNull();
    expect(
      await db
        .collection("sessions")
        .countDocuments({ userId: ids.targetUser }),
    ).toBe(0);
    expect(
      await db
        .collection("userRequests")
        .countDocuments({ userId: ids.targetUser }),
    ).toBe(0);
    expect(
      await db.collection("bananaRequests").countDocuments({
        startRequestId: {
          $in: [requestIds.targetA, requestIds.targetB, requestIds.targetC],
        },
      }),
    ).toBe(0);
    expect(
      await db.collection("csends").countDocuments({
        "payload.startRequestId": {
          $in: [requestIds.targetA, requestIds.targetB, requestIds.targetC],
        },
      }),
    ).toBe(0);
    expect(
      await db.collection("csends").findOne({
        container_id: "target-container-a",
        payload: {},
      }),
    ).toBeNull();
    expect(
      await db.collection("bananaRequests").findOne({
        startRequestId: requestIds.shared,
      }),
    ).toMatchObject({ modelInputs: { prompt: "ambiguous shared prompt" } });
    expect(
      await db.collection("csends").findOne({
        "payload.startRequestId": requestIds.shared,
      }),
    ).toMatchObject({ container_id: "shared-container" });
    expect(
      await db.collection("stars").countDocuments({
        _id: { $in: [ids.targetStarA, ids.targetStarB] },
      }),
    ).toBe(0);
    expect(
      await db.collection("likes").countDocuments({
        $or: [
          { userId: ids.targetUser },
          { starId: { $in: [ids.targetStarA, ids.targetStarB] } },
        ],
      }),
    ).toBe(0);
    expect(
      await db.collection("reportedStars").countDocuments({
        $or: [
          { userId: ids.targetUser },
          { starId: { $in: [ids.targetStarA, ids.targetStarB] } },
        ],
      }),
    ).toBe(0);
    expect(
      await db.collection("files").countDocuments({
        _id: {
          $in: [ids.targetFileOnly, ids.targetFileDirect],
        },
      }),
    ).toBe(0);
    expect(
      await db.collection("files").findOne({ _id: ids.targetFileShared }),
    ).toMatchObject({ sha256: "sha-shared" });
    expect(
      await db.collection("files").findOne({
        _id: ids.targetFileShared,
        userId: { $exists: true },
      }),
    ).toBeNull();
    expect(
      await db.collection("statsDaily").countDocuments({
        "requestsByUser.userId": ids.targetUser,
      }),
    ).toBe(0);
    expect(await db.collection("statsHourly").countDocuments()).toBe(1);
    expect(await db.collection("creditCodes").countDocuments()).toBe(1);
    expect(await db.collection("bananaCapacity").countDocuments()).toBe(1);

    const anonymizedOrders = await db
      .collection("orders")
      .find({ _id: { $in: [ids.targetOrderA, ids.targetOrderB] } })
      .sort({ _id: 1 })
      .toArray();
    expect(anonymizedOrders).toHaveLength(2);
    expect(anonymizedOrders.map((order) => order.userId)).toEqual([
      undefined,
      undefined,
    ]);
    expect(anonymizedOrders.map((order) => order.amount)).toEqual([300, 1_000]);
    expect(
      anonymizedOrders.map((order) => order.stripePaymentIntentId),
    ).toEqual(["pi_target_a", "pi_target_b"]);

    const survivorStar = await db.collection("stars").findOne({
      _id: ids.survivorStar,
    });
    expect(survivorStar).toMatchObject({ likes: 1, reports: 1 });
    expect(await db.collection("likes").countDocuments()).toBe(1);
    expect(await db.collection("reportedStars").countDocuments()).toBe(1);

    expect(
      await db.collection("files").findOne({ _id: ids.controlFileShared }),
    ).toMatchObject({
      sha256: "sha-shared",
    });
    expect(
      await db.collection("files").findOne({ _id: ids.controlFileDirect }),
    ).toMatchObject({
      sha256: "sha-control-only",
      userId: ids.controlUser,
    });
    expect(
      await db.collection("files").findOne({ _id: ids.foreignOwnedFile }),
    ).toMatchObject({
      sha256: "sha-foreign-owned",
      userId: ids.controlUser,
    });
    expect(
      await db.collection("orders").findOne({ _id: ids.controlOrder }),
    ).toMatchObject({
      userId: ids.controlUser,
    });
    expect(
      await db.collection("bananaRequests").countDocuments({
        startRequestId: requestIds.control,
      }),
    ).toBe(1);
    expect(
      await db.collection("csends").countDocuments({
        container_id: "control-container",
      }),
    ).toBe(1);
    expect(
      await db
        .collection("statsDaily")
        .findOne(
          { date: new Date("2026-01-01T00:00:00.000Z") },
          { projection: { _id: 0, requestsByUser: 1, totalRequests: 1 } },
        ),
    ).toEqual({
      requestsByUser: [{ requests: 7, userId: ids.controlUser }],
      totalRequests: 10,
    });
    expect(
      await db.collection("verification_tokens").countDocuments({
        $or: [
          { identifier: "delete-me@example.test" },
          { email: "delete-me@example.test" },
        ],
      }),
    ).toBe(3);
    expect(
      await db.collection("verification_tokens").countDocuments({
        token: "target-only-verification-token",
      }),
    ).toBe(0);
    expect(
      await db.collection("verification_tokens").countDocuments({
        token: "shared-identifier-wins",
      }),
    ).toBe(1);
    expect(
      await db.collection("verification_tokens").countDocuments({
        identifier: "keep-me@example.test",
      }),
    ).toBe(1);
    await expect(
      recheckS3DeletionKeys(db, [
        "sha-direct-target-only",
        "sha-shared",
        "sha-shared",
      ]),
    ).resolves.toEqual({
      deleteKeys: ["sha-direct-target-only"],
      sharedKeys: ["sha-shared"],
    });

    const repeated = await deleteAccountData({
      client: mongo.client,
      db: mongo.db,
      external,
      targetUserId: ids.targetUser,
    });
    expect(repeated).toEqual({
      collections: [],
      resources: [],
      status: "not_found",
      targetUserId: ids.targetUser.toHexString(),
    });
    expect(external.deleteS3Objects).toHaveBeenCalledOnce();
    expect(external.deleteStripeCustomer).not.toHaveBeenCalled();
  }, 30_000);

  it("serializes concurrent administrator deletions so exactly one admin survives", async () => {
    const raceDb = mongo.client.db("account-deletion-admin-race");
    const firstAdmin = new ObjectId();
    const secondAdmin = new ObjectId();

    try {
      await raceDb.collection("users").insertMany([
        {
          _id: firstAdmin,
          admin: true,
          emails: [{ value: "first-admin@example.test" }],
        },
        {
          _id: secondAdmin,
          admin: true,
          emails: [{ value: "second-admin@example.test" }],
        },
      ]);

      const results = await Promise.allSettled([
        deleteAccountData({
          client: mongo.client,
          db: raceDb,
          targetUserId: firstAdmin,
        }),
        deleteAccountData({
          client: mongo.client,
          db: raceDb,
          targetUserId: secondAdmin,
        }),
      ]);
      const fulfilled = results.filter(
        (result) => result.status === "fulfilled",
      );
      const rejected = results.filter((result) => result.status === "rejected");

      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0]).toMatchObject({
        reason: expect.any(LastAdminDeletionError),
      });
      expect(
        await raceDb.collection("users").countDocuments({ admin: true }),
      ).toBe(1);
      expect(await raceDb.collection("users").countDocuments()).toBe(1);
      expect(
        await raceDb
          .collection("accountDataGuards")
          .findOne({ _id: "admin-deletion" } as never),
      ).toMatchObject({ version: 1 });
    } finally {
      await raceDb.dropDatabase();
    }
  }, 30_000);

  it("does not expose raw external-service errors in the deletion report", async () => {
    const failureDb = mongo.client.db("account-deletion-external-errors");
    const targetUserId = new ObjectId();
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    try {
      await failureDb.collection("users").insertOne({
        _id: targetUserId,
        admin: false,
        stripeCustomerId: "cus_private_identifier",
      });
      await failureDb.collection("files").insertOne({
        _id: new ObjectId(),
        sha256: "private-s3-object-key",
        userId: targetUserId,
      });

      const failingExternal = {
        deleteS3Objects: vi.fn(async () => {
          throw new Error("raw S3 SDK failure with private-s3-object-key");
        }),
        deleteStripeCustomer: vi.fn(async () => {
          throw new Error("raw Stripe SDK failure with cus_private_identifier");
        }),
      };
      const report = await deleteAccountData({
        client: mongo.client,
        db: failureDb,
        external: failingExternal,
        targetUserId,
      });

      expect(report.status).toBe("partial");
      expect(report.deletionId).toEqual(expect.any(String));
      expect(report.resources).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            action: "retained",
            affectedRows: 1,
            name: "s3",
            reason: "Queued for administrator retry",
          }),
          expect.objectContaining({
            action: "retained",
            affectedRows: 1,
            name: "stripe",
            reason: "Queued for administrator retry",
          }),
        ]),
      );
      expect(JSON.stringify(report)).not.toContain("private-s3-object-key");
      expect(JSON.stringify(report)).not.toContain("cus_private_identifier");
      expect(
        await failureDb.collection("users").findOne({ _id: targetUserId }),
      ).toBeNull();

      const deletionId = new ObjectId(report.deletionId);
      const persistedJob = await failureDb
        .collection("accountDeletionJobs")
        .findOne({ _id: deletionId });
      expect(persistedJob).toMatchObject({
        attempts: 1,
        pendingS3Keys: ["private-s3-object-key"],
        pendingStripeCustomerId: "cus_private_identifier",
        targetUserId,
      });
      expect(Object.keys(persistedJob || {}).toSorted()).toEqual([
        "_id",
        "attempts",
        "collectionReport",
        "createdAt",
        "databaseCompletedAt",
        "pendingS3Keys",
        "pendingStripeCustomerId",
        "phase",
        "resourceReport",
        "revokedSessions",
        "targetUserId",
        "updatedAt",
      ]);
      expect(JSON.stringify(persistedJob)).not.toContain("raw S3 SDK failure");
      expect(JSON.stringify(persistedJob)).not.toContain(
        "raw Stripe SDK failure",
      );
      expect(consoleError).toHaveBeenCalledTimes(2);

      const retryExternal = {
        deleteS3Objects: vi.fn(async (keys: string[]) => ({
          affectedRows: keys.length,
        })),
        deleteStripeCustomer: vi.fn(async () => ({ affectedRows: 1 })),
      };
      const retried = await retryAccountDeletionJob({
        client: mongo.client,
        db: failureDb,
        deletionId,
        external: retryExternal,
      });

      expect(retried.status).toBe("complete");
      expect(retried.deletionId).toBeUndefined();
      expect(retryExternal.deleteS3Objects).toHaveBeenCalledExactlyOnceWith([
        "private-s3-object-key",
      ]);
      expect(
        retryExternal.deleteStripeCustomer,
      ).toHaveBeenCalledExactlyOnceWith("cus_private_identifier");
      expect(
        await failureDb
          .collection("accountDeletionJobs")
          .findOne({ _id: deletionId }),
      ).toBeNull();
      await expect(
        retryAccountDeletionJob({
          client: mongo.client,
          db: failureDb,
          deletionId,
          external: retryExternal,
        }),
      ).rejects.toBeInstanceOf(AccountDeletionJobNotFoundError);
      expect(retryExternal.deleteS3Objects).toHaveBeenCalledTimes(1);
      expect(retryExternal.deleteStripeCustomer).toHaveBeenCalledTimes(1);
    } finally {
      consoleError.mockRestore();
      await failureDb.dropDatabase();
    }
  }, 30_000);

  it("freshly rechecks shared S3 and Stripe references before a retry", async () => {
    const sharedDb = mongo.client.db("account-deletion-late-shared-refs");
    const targetUserId = new ObjectId();
    const survivingUserId = new ObjectId();

    try {
      await sharedDb.collection("users").insertOne({
        _id: targetUserId,
        admin: false,
        stripeCustomerId: "cus_later_shared",
      });
      await sharedDb.collection("files").insertOne({
        _id: new ObjectId(),
        sha256: "sha-later-shared",
        userId: targetUserId,
      });

      const initial = await deleteAccountData({
        client: mongo.client,
        db: sharedDb,
        external: {},
        targetUserId,
      });
      expect(initial.status).toBe("partial");
      expect(initial.deletionId).toEqual(expect.any(String));

      await sharedDb.collection("users").insertOne({
        _id: survivingUserId,
        admin: false,
        stripeCustomerId: "cus_later_shared",
      });
      await sharedDb.collection("files").insertOne({
        _id: new ObjectId(),
        sha256: "sha-later-shared",
        userId: survivingUserId,
      });

      const external = {
        deleteS3Objects: vi.fn(async (keys: string[]) => ({
          affectedRows: keys.length,
        })),
        deleteStripeCustomer: vi.fn(async () => ({ affectedRows: 1 })),
      };
      const retried = await retryAccountDeletionJob({
        client: mongo.client,
        db: sharedDb,
        deletionId: initial.deletionId as string,
        external,
      });

      expect(retried.status).toBe("complete");
      expect(retried.resources).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            action: "skipped_shared",
            affectedRows: 1,
            name: "s3",
          }),
          expect.objectContaining({
            action: "skipped_shared",
            affectedRows: 1,
            name: "stripe",
          }),
        ]),
      );
      expect(external.deleteS3Objects).not.toHaveBeenCalled();
      expect(external.deleteStripeCustomer).not.toHaveBeenCalled();
      expect(
        await sharedDb.collection("accountDeletionJobs").countDocuments(),
      ).toBe(0);
      expect(
        await sharedDb.collection("files").findOne({
          sha256: "sha-later-shared",
          userId: survivingUserId,
        }),
      ).not.toBeNull();
    } finally {
      await sharedDb.dropDatabase();
    }
  }, 30_000);
});
