import { ObjectId } from "mongodb";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  ACCOUNT_DATA_EXPORT_COLLECTIONS,
  ACCOUNT_DATA_REDACTED_VALUE,
  exportAccountData,
} from "../../src/server/account-data";
import {
  startMongoReplicaSet,
  type TestMongoReplicaSet,
} from "../helpers/mongo-replica-set";

describe.sequential("account data export", () => {
  let mongo: TestMongoReplicaSet;

  const ids = {
    controlFile: new ObjectId("64c000000000000000000021"),
    controlStar: new ObjectId("64c000000000000000000011"),
    controlUser: new ObjectId("64c000000000000000000002"),
    foreignOwnedFile: new ObjectId("64c000000000000000000023"),
    targetFile: new ObjectId("64c000000000000000000022"),
    targetStar: new ObjectId("64c000000000000000000012"),
    targetUser: new ObjectId("64c000000000000000000001"),
  };

  beforeAll(async () => {
    mongo = await startMongoReplicaSet();
    const createdAt = new Date("2026-08-08T10:00:00.000Z");

    await Promise.all([
      mongo.db.collection("users").insertMany([
        {
          _id: ids.targetUser,
          createdAt,
          displayName: "Export Me",
          emails: [{ value: "export@example.test", verified: true }],
          password: "target-password-secret",
          services: [
            {
              accessToken: "target-legacy-token",
              id: "target-provider-id",
              service: "github",
            },
          ],
        },
        {
          _id: ids.controlUser,
          createdAt,
          displayName: "Keep Private",
          emails: [{ value: "control@example.test", verified: true }],
        },
      ]),
      mongo.db.collection("accounts").insertMany([
        {
          _id: new ObjectId(),
          access_token: "target-oauth-token",
          provider: "github",
          providerAccountId: "target-provider-id",
          refresh_token: "target-refresh-token",
          userId: ids.targetUser,
        },
        {
          _id: new ObjectId(),
          access_token: "control-oauth-token",
          provider: "github",
          providerAccountId: "control-provider-id",
          userId: ids.controlUser,
        },
      ]),
      mongo.db
        .collection<{ _id: ObjectId | string; [key: string]: unknown }>(
          "sessions",
        )
        .insertMany([
          {
            _id: "target-session-id",
            expires: new Date("2030-01-01T00:00:00.000Z"),
            ip: "203.0.113.10",
            sessionToken: "target-session-token",
            userAgent: "Target Browser",
            userId: ids.targetUser,
          },
          {
            _id: "control-session-id",
            sessionToken: "control-session-token",
            userId: ids.controlUser,
          },
        ]),
      mongo.db.collection("orders").insertMany([
        {
          _id: new ObjectId(),
          amount: 300,
          stripePaymentIntentId: "pi_target",
          userId: ids.targetUser,
        },
        {
          _id: new ObjectId(),
          amount: 999,
          stripePaymentIntentId: "pi_control",
          userId: ids.controlUser,
        },
      ]),
      mongo.db.collection("userRequests").insertMany([
        {
          callInputs: {
            startRequestId: "request-shared",
            textual_inversions: [
              "https://civitai.com/api/download/models/123#fname=embedding.pt&token=integration-civitai-token",
            ],
          },
          _id: new ObjectId(),
          date: createdAt,
          startRequestId: "request-target",
          userId: ids.targetUser,
        },
        {
          callInputs: { startRequestId: "request-shared" },
          _id: new ObjectId(),
          date: createdAt,
          startRequestId: "request-control",
          userId: ids.controlUser,
        },
      ]),
      mongo.db.collection("bananaRequests").insertMany([
        {
          _id: new ObjectId(),
          modelInputs: { prompt: "target private prompt" },
          startRequestId: "request-target",
        },
        {
          _id: new ObjectId(),
          modelInputs: { prompt: "control private prompt" },
          startRequestId: "request-control",
        },
        {
          _id: new ObjectId(),
          modelInputs: { prompt: "ambiguous shared prompt" },
          startRequestId: "request-shared",
        },
      ]),
      mongo.db.collection("csends").insertMany([
        {
          _id: new ObjectId(),
          container_id: "reused-container",
          payload: { startRequestId: "request-target" },
          status: "target-start",
        },
        {
          _id: new ObjectId(),
          container_id: "reused-container",
          payload: {},
          status: "ambiguous-same-container",
        },
        {
          _id: new ObjectId(),
          container_id: "control-container",
          payload: { startRequestId: "request-control" },
          status: "control-start",
        },
        {
          _id: new ObjectId(),
          container_id: "shared-container",
          payload: { startRequestId: "request-shared" },
          status: "ambiguous-shared-status",
        },
      ]),
      mongo.db.collection("stars").insertMany([
        {
          _id: ids.targetStar,
          files: {
            init: ids.foreignOwnedFile,
            output: ids.targetFile,
          },
          userId: ids.targetUser,
        },
        {
          _id: ids.controlStar,
          files: { output: ids.controlFile },
          userId: ids.controlUser,
        },
      ]),
      mongo.db.collection("likes").insertMany([
        {
          _id: new ObjectId(),
          liked: true,
          starId: ids.controlStar,
          userId: ids.targetUser,
        },
        {
          _id: new ObjectId(),
          liked: true,
          starId: ids.targetStar,
          userId: ids.controlUser,
        },
      ]),
      mongo.db.collection("reportedStars").insertMany([
        {
          _id: new ObjectId(),
          reason: "target report",
          starId: ids.controlStar,
          userId: ids.targetUser,
        },
        {
          _id: new ObjectId(),
          reason: "private control report",
          starId: ids.targetStar,
          userId: ids.controlUser,
        },
      ]),
      mongo.db.collection("files").insertMany([
        {
          _id: ids.targetFile,
          sha256: "sha-target",
          userId: ids.targetUser,
        },
        {
          _id: ids.controlFile,
          sha256: "sha-control",
          userId: ids.controlUser,
        },
        {
          _id: ids.foreignOwnedFile,
          sha256: "sha-foreign-owned",
          size: 123,
          userId: ids.controlUser,
        },
      ]),
      mongo.db.collection("statsDaily").insertOne({
        _id: new ObjectId(),
        date: new Date("2026-08-08T00:00:00.000Z"),
        requestsByUser: [
          { requests: 2, userId: ids.targetUser },
          { requests: 8, userId: ids.controlUser },
        ],
        totalRequests: 10,
      }),
    ]);
  }, 30_000);

  afterAll(async () => {
    await mongo?.stop();
  }, 15_000);

  it("exports the explicit owned graph without credentials or other-user identifiers", async () => {
    const accountData = await exportAccountData({
      db: mongo.db,
      targetUserId: ids.targetUser,
    });

    expect(accountData).not.toBeNull();
    if (!accountData) throw new Error("Expected account export");

    expect(accountData.collections.map(({ name }) => name)).toEqual(
      ACCOUNT_DATA_EXPORT_COLLECTIONS,
    );
    const byName = Object.fromEntries(
      accountData.collections.map(({ data, name }) => [name, data]),
    );
    const serialized = JSON.stringify(byName);

    expect(byName.users).toMatchObject([
      {
        _id: ids.targetUser,
        password: ACCOUNT_DATA_REDACTED_VALUE,
        services: [{ accessToken: ACCOUNT_DATA_REDACTED_VALUE }],
      },
    ]);
    expect(byName.accounts).toMatchObject([
      {
        access_token: ACCOUNT_DATA_REDACTED_VALUE,
        refresh_token: ACCOUNT_DATA_REDACTED_VALUE,
        userId: ids.targetUser,
      },
    ]);
    expect(byName.bananaRequests).toMatchObject([
      { modelInputs: { prompt: "target private prompt" } },
    ]);
    expect(serialized).toContain("token=%5BREDACTED%5D");
    expect(byName.csends).toMatchObject([{ status: "target-start" }]);
    expect(byName.likes).toMatchObject({
      given: [{ starId: ids.controlStar, userId: ids.targetUser }],
      received: [{ count: 1, starId: ids.targetStar.toHexString() }],
    });
    expect(byName.reportedStars).toMatchObject({
      given: [{ reason: "target report", userId: ids.targetUser }],
      received: [{ count: 1, starId: ids.targetStar.toHexString() }],
    });
    expect(byName.sessions).toEqual([
      {
        expires: new Date("2030-01-01T00:00:00.000Z"),
        ip: "203.0.113.10",
        userAgent: "Target Browser",
      },
    ]);
    const exportedFiles = byName.files as Array<Record<string, unknown>>;
    expect(exportedFiles).toHaveLength(2);
    expect(
      exportedFiles.find(
        (file) => String(file._id) === ids.targetFile.toHexString(),
      ),
    ).toMatchObject({ _id: ids.targetFile, userId: ids.targetUser });
    const foreignFile = exportedFiles.find(
      (file) => String(file._id) === ids.foreignOwnedFile.toHexString(),
    );
    expect(foreignFile).toMatchObject({
      _id: ids.foreignOwnedFile,
      sha256: "sha-foreign-owned",
      size: 123,
    });
    expect(foreignFile).not.toHaveProperty("userId");
    expect(byName.statsDaily).toMatchObject([
      { requestsByUser: [{ requests: 2, userId: ids.targetUser }] },
    ]);

    for (const privateValue of [
      ids.controlUser.toHexString(),
      "ambiguous-same-container",
      "ambiguous-shared-status",
      "ambiguous shared prompt",
      "control private prompt",
      "control-oauth-token",
      "private control report",
      "target-legacy-token",
      "target-oauth-token",
      "target-password-secret",
      "target-refresh-token",
      "target-session-id",
      "target-session-token",
      "integration-civitai-token",
    ]) {
      expect(serialized).not.toContain(privateValue);
    }
  }, 30_000);
});
