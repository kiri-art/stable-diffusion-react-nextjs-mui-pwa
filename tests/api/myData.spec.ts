import JSZip from "jszip";
import type { NextApiRequest, NextApiResponse } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: { name: "test-db" },
  exportAccountData: vi.fn(),
  resolveAuthenticatedUserId: vi.fn(),
}));

vi.mock("../../src/api-lib/db-full", () => ({
  default: { dba: { dbPromise: Promise.resolve(mocks.db) } },
}));

vi.mock("../../src/api-lib/requestAuth", () => ({
  resolveAuthenticatedUserId: mocks.resolveAuthenticatedUserId,
}));

vi.mock("../../src/server/account-data", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../src/server/account-data")>()),
  exportAccountData: mocks.exportAccountData,
}));

import myData from "../../pages/api/myData";
import {
  ACCOUNT_DATA_EXPORT_COLLECTIONS,
  ACCOUNT_DATA_REDACTED_VALUE,
} from "../../src/server/account-data";

function request(overrides: Partial<NextApiRequest> = {}): NextApiRequest {
  return {
    body: {},
    headers: {},
    method: "GET",
    query: {},
    ...overrides,
  } as NextApiRequest;
}

function response() {
  const headers = new Map<string, number | readonly string[] | string>();
  let body: unknown;
  let statusCode = 200;
  const res = {
    json: vi.fn((value: unknown) => {
      body = value;
      return res;
    }),
    send: vi.fn((value: unknown) => {
      body = value;
      return res;
    }),
    setHeader: vi.fn(
      (name: string, value: number | readonly string[] | string) => {
        headers.set(name.toLowerCase(), value);
        return res;
      },
    ),
    status: vi.fn((value: number) => {
      statusCode = value;
      return res;
    }),
  } as unknown as NextApiResponse;

  return {
    body: () => body,
    header: (name: string) => headers.get(name.toLowerCase()),
    res,
    statusCode: () => statusCode,
  };
}

describe("GET /api/myData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows GET only and advertises the allowed method", async () => {
    const req = request({ method: "POST" });
    const result = response();

    await myData(req, result.res);

    expect(result.statusCode()).toBe(405);
    expect(result.header("allow")).toBe("GET");
    expect(mocks.resolveAuthenticatedUserId).not.toHaveBeenCalled();
    expect(mocks.exportAccountData).not.toHaveBeenCalled();
  });

  it("does not accept a query or body session ID as authentication", async () => {
    mocks.resolveAuthenticatedUserId.mockResolvedValue(null);
    const req = request({
      body: { sessionId: "attacker-body-session" },
      query: { sessionId: "attacker-query-session" },
    });
    const result = response();

    await myData(req, result.res);

    expect(result.statusCode()).toBe(401);
    expect(result.body()).toEqual({ error: "Unauthorized" });
    expect(mocks.resolveAuthenticatedUserId).toHaveBeenCalledExactlyOnceWith(
      req,
      result.res,
    );
    expect(mocks.exportAccountData).not.toHaveBeenCalled();
  });

  it("exports only the cookie-resolved user with private download headers", async () => {
    const targetUserId = "64b000000000000000000003";
    mocks.resolveAuthenticatedUserId.mockResolvedValue(targetUserId);
    mocks.exportAccountData.mockResolvedValue({
      collections: ACCOUNT_DATA_EXPORT_COLLECTIONS.map((name) => ({
        data:
          name === "users"
            ? [{ _id: targetUserId, accessToken: ACCOUNT_DATA_REDACTED_VALUE }]
            : name === "sessions"
              ? [
                  {
                    expires: "2030-01-01T00:00:00.000Z",
                    ip: "203.0.113.10",
                    userAgent: "Test Browser",
                  },
                ]
              : [],
        name,
      })),
      targetUserId,
    });
    const req = request({
      body: { sessionId: "ignored-body-session" },
      headers: { cookie: "next-auth.session-token=cookie-credential" },
      query: { sessionId: "ignored-query-session" },
    });
    const result = response();

    await myData(req, result.res);

    expect(mocks.exportAccountData).toHaveBeenCalledExactlyOnceWith({
      db: mocks.db,
      targetUserId,
    });
    expect(result.statusCode()).toBe(200);
    expect(result.header("content-type")).toBe("application/zip");
    expect(result.header("cache-control")).toContain("no-store");
    expect(result.header("cross-origin-resource-policy")).toBe("same-origin");
    expect(result.header("referrer-policy")).toBe("no-referrer");
    expect(result.header("x-content-type-options")).toBe("nosniff");
    expect(result.header("x-frame-options")).toBe("DENY");
    expect(result.header("content-disposition")).toBe(
      `attachment; filename="kiri-account-data-${targetUserId}.zip"`,
    );

    const archive = await JSZip.loadAsync(result.body() as Buffer);
    expect(Object.keys(archive.files).sort()).toEqual(
      ACCOUNT_DATA_EXPORT_COLLECTIONS.map((name) => `${name}.json`).sort(),
    );
    await expect(
      archive.file("sessions.json")?.async("string"),
    ).resolves.toContain("203.0.113.10");
    await expect(
      archive.file("users.json")?.async("string"),
    ).resolves.toContain(ACCOUNT_DATA_REDACTED_VALUE);
  });
});
