import { ObjectId } from "mongodb";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { unlinkHistoricalProviderLogs } from "../../src/server/account-data/accountUsage";
import {
  startMongoReplicaSet,
  type TestMongoReplicaSet,
} from "../helpers/mongo-replica-set";

describe.sequential("historical provider-log unlink", () => {
  let mongo: TestMongoReplicaSet;
  const userId = new ObjectId("64d000000000000000000001");

  beforeAll(async () => {
    mongo = await startMongoReplicaSet();
    const userRequests = mongo.db.collection("userRequests");
    await userRequests.insertMany([
      {
        _id: new ObjectId(),
        callInputs: { startRequestId: "raw-request-a" },
        credits: 1,
        date: new Date("2026-08-09T10:00:00.000Z"),
        modelInputs: { prompt: "raw prompt a" },
        paid: false,
        startRequestId: "raw-request-a",
        userId,
      },
      {
        _id: new ObjectId(),
        callID: "raw-call-b",
        credits: 2,
        date: new Date("2026-08-09T20:00:00.000Z"),
        paid: true,
        startRequestId: "raw-request-b",
        userId,
      },
      {
        _id: new ObjectId(),
        callInputs: { startRequestId: "orphan-request" },
        date: new Date("2026-08-09T21:00:00.000Z"),
      },
      {
        _id: {
          date: new Date("2026-08-09T00:00:00.000Z"),
          userId,
        } as never,
        credits: 4,
        date: new Date("2026-08-09T00:00:00.000Z"),
        freeCredits: 3,
        paidCredits: 1,
        requests: 3,
        schemaVersion: 2,
        userId,
      },
    ]);
    await userRequests.createIndex(
      { startRequestId: 1 },
      { name: "userRequests_startRequestId" },
    );
    await mongo.db.collection("bananaRequests").insertOne({
      _id: new ObjectId(),
      modelInputs: { prompt: "raw prompt a" },
      startRequestId: "raw-request-a",
    });
    await mongo.db.collection("csends").insertOne({
      _id: new ObjectId(),
      payload: { startRequestId: "raw-request-a" },
    });
  }, 30_000);

  afterAll(async () => {
    await mongo?.stop();
  }, 15_000);

  it("dry-runs, atomically rebuilds daily account usage, and is idempotent", async () => {
    const providerLogsBefore = await Promise.all([
      mongo.db.collection("bananaRequests").find().toArray(),
      mongo.db.collection("csends").find().toArray(),
    ]);

    await expect(unlinkHistoricalProviderLogs(mongo.db)).resolves.toEqual({
      accountDays: 1,
      applied: false,
      legacyIdentifierDocuments: 3,
      missingDateDocuments: 0,
      orphanDocumentsRemoved: 0,
      sourceDocuments: 4,
    });
    expect(await mongo.db.collection("userRequests").countDocuments()).toBe(4);

    await expect(
      unlinkHistoricalProviderLogs(mongo.db, { apply: true }),
    ).resolves.toEqual({
      accountDays: 1,
      applied: true,
      legacyIdentifierDocuments: 3,
      missingDateDocuments: 0,
      orphanDocumentsRemoved: 1,
      sourceDocuments: 4,
    });

    const accountUsage = await mongo.db
      .collection("userRequests")
      .findOne({ userId });
    expect(accountUsage).toEqual({
      _id: { date: new Date("2026-08-09T00:00:00.000Z"), userId },
      credits: 7,
      date: new Date("2026-08-09T00:00:00.000Z"),
      freeCredits: 4,
      paidCredits: 3,
      requests: 5,
      schemaVersion: 2,
      userId,
    });
    expect(JSON.stringify(accountUsage)).not.toMatch(
      /callID|callInputs|modelInputs|prompt|startRequestId/,
    );
    expect(
      (await mongo.db.collection("userRequests").indexes()).map(
        ({ name }) => name,
      ),
    ).not.toContain("userRequests_startRequestId");
    await expect(
      Promise.all([
        mongo.db.collection("bananaRequests").find().toArray(),
        mongo.db.collection("csends").find().toArray(),
      ]),
    ).resolves.toEqual(providerLogsBefore);

    const once = await mongo.db.collection("userRequests").find().toArray();
    await unlinkHistoricalProviderLogs(mongo.db, { apply: true });
    await expect(
      mongo.db.collection("userRequests").find().toArray(),
    ).resolves.toEqual(once);
  }, 30_000);
});
