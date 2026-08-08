import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";

import {
  ACCOUNT_DATA_EXPORT_COLLECTIONS,
  ACCOUNT_DATA_REDACTED_VALUE,
  collectFileReferences,
  sanitizeAccountDataValue,
  selectExportFiles,
  selectExportInteractions,
  selectExportSessions,
  selectExportStatsDaily,
} from ".";

describe("account data export privacy", () => {
  it("collects ObjectId references from current and legacy star file shapes", () => {
    const output = new ObjectId();
    const init = new ObjectId();
    const mask = new ObjectId();
    const legacyNested = new ObjectId();

    expect(
      collectFileReferences({
        init,
        legacy: { gallery: [{ file: legacyNested }] },
        mask,
        output,
      }),
    ).toEqual([init, legacyNested, mask, output]);
    expect(
      collectFileReferences({
        legacy: {
          gallery: [{ file: legacyNested }],
        },
      }),
    ).toEqual([legacyNested]);
  });

  it("redacts credentials recursively without changing ordinary account data", () => {
    const createdAt = new Date("2026-08-08T10:00:00.000Z");
    const userId = new ObjectId();
    const sanitized = sanitizeAccountDataValue({
      _id: userId,
      access_token: "oauth-access-secret",
      client_secret: "oauth-client-secret",
      createdAt,
      passwordHash: "password-secret",
      profile: {
        displayName: "Export Me",
        id_token: "oauth-id-secret",
        modelUrl:
          "https://civitai.com/api/download/models/123#fname=embedding.pt&token=url-token-secret",
        signedUrl:
          "https://assets.example.test/model.bin?X-Amz-Security-Token=signed-url-secret&part=1",
        tokenCount: 42,
      },
      refreshToken: "oauth-refresh-secret",
      services: [
        {
          accessToken: "legacy-service-secret",
          oauth_token: "legacy-oauth-secret",
          service: "github",
        },
      ],
      sessionId: "legacy-session-secret",
    });

    expect(sanitized).toEqual({
      _id: userId,
      access_token: ACCOUNT_DATA_REDACTED_VALUE,
      client_secret: ACCOUNT_DATA_REDACTED_VALUE,
      createdAt,
      passwordHash: ACCOUNT_DATA_REDACTED_VALUE,
      profile: {
        displayName: "Export Me",
        id_token: ACCOUNT_DATA_REDACTED_VALUE,
        modelUrl:
          "https://civitai.com/api/download/models/123#fname=embedding.pt&token=%5BREDACTED%5D",
        signedUrl:
          "https://assets.example.test/model.bin?X-Amz-Security-Token=%5BREDACTED%5D&part=1",
        tokenCount: 42,
      },
      refreshToken: ACCOUNT_DATA_REDACTED_VALUE,
      services: [
        {
          accessToken: ACCOUNT_DATA_REDACTED_VALUE,
          oauth_token: ACCOUNT_DATA_REDACTED_VALUE,
          service: "github",
        },
      ],
      sessionId: ACCOUNT_DATA_REDACTED_VALUE,
    });

    const json = JSON.stringify(sanitized);
    for (const secret of [
      "oauth-access-secret",
      "oauth-client-secret",
      "password-secret",
      "oauth-id-secret",
      "oauth-refresh-secret",
      "legacy-service-secret",
      "legacy-oauth-secret",
      "legacy-session-secret",
      "url-token-secret",
      "signed-url-secret",
    ]) {
      expect(json).not.toContain(secret);
    }
  });

  it("exports only non-replayable session metadata", () => {
    expect(ACCOUNT_DATA_EXPORT_COLLECTIONS).toContain("sessions");

    const expires = new Date("2030-01-01T00:00:00.000Z");
    const selected = selectExportSessions([
      {
        _id: "private-session-id",
        expires,
        ip: "203.0.113.10",
        sessionToken: "private-session-token",
        userAgent: "Test Browser",
        userId: new ObjectId(),
      },
    ]);

    expect(selected).toEqual([
      {
        expires,
        ip: "203.0.113.10",
        userAgent: "Test Browser",
      },
    ]);
    expect(JSON.stringify(selected)).not.toContain("private-session");
  });

  it("removes a foreign file owner ID without mutating its metadata", () => {
    const targetUserId = new ObjectId("64b000000000000000000003");
    const otherUserId = new ObjectId("64b000000000000000000004");
    const targetFile = {
      _id: new ObjectId(),
      sha256: "sha-target",
      userId: targetUserId,
    };
    const foreignFile = {
      _id: new ObjectId(),
      sha256: "sha-foreign",
      size: 123,
      userId: otherUserId,
    };

    const selected = selectExportFiles([targetFile, foreignFile], targetUserId);

    expect(selected).toEqual([
      targetFile,
      {
        _id: foreignFile._id,
        sha256: "sha-foreign",
        size: 123,
      },
    ]);
    expect(JSON.stringify(selected)).not.toContain(otherUserId.toHexString());
    expect(foreignFile.userId).toBe(otherUserId);
  });

  it("keeps given interactions and aggregates received interactions anonymously", () => {
    const targetUserId = new ObjectId("64b000000000000000000003");
    const otherUserId = new ObjectId("64b000000000000000000004");
    const targetStarId = new ObjectId("64b000000000000000000011");
    const otherStarId = new ObjectId("64b000000000000000000012");

    const selected = selectExportInteractions({
      documents: [
        {
          _id: new ObjectId(),
          liked: true,
          starId: otherStarId,
          userId: targetUserId,
        },
        {
          _id: new ObjectId(),
          liked: true,
          starId: targetStarId,
          userId: otherUserId,
        },
        {
          _id: new ObjectId(),
          liked: false,
          starId: targetStarId,
          userId: new ObjectId(),
        },
        {
          _id: new ObjectId(),
          liked: true,
          starId: otherStarId,
          userId: otherUserId,
        },
      ],
      ownedStarIds: [targetStarId],
      targetUserId,
    });

    expect(selected.given).toHaveLength(1);
    expect(selected.received).toEqual([
      { count: 1, starId: targetStarId.toHexString() },
    ]);
    expect(JSON.stringify(selected)).not.toContain(otherUserId.toHexString());
  });

  it("selects only the target's nested daily statistics", () => {
    const targetUserId = new ObjectId("64b000000000000000000003");
    const otherUserId = new ObjectId("64b000000000000000000004");
    const date = new Date("2026-08-08T00:00:00.000Z");

    const selected = selectExportStatsDaily(
      [
        {
          _id: new ObjectId(),
          date,
          requestsByUser: [
            { requests: 3, userId: targetUserId },
            { requests: 7, userId: otherUserId },
          ],
          totalRequests: 10,
        },
        {
          _id: new ObjectId(),
          date,
          requestsByUser: [{ requests: 9, userId: otherUserId }],
        },
      ],
      targetUserId,
    );

    expect(selected).toHaveLength(1);
    expect(selected[0]).toMatchObject({
      date,
      requestsByUser: [{ requests: 3, userId: targetUserId }],
    });
    expect(selected[0]).not.toHaveProperty("totalRequests");
    expect(JSON.stringify(selected)).not.toContain(otherUserId.toHexString());
  });
});
