import crypto from "node:crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteMany: vi.fn(),
  findOne: vi.fn(),
  insertOne: vi.fn(),
  isDeletedCallbackIdentifier: vi.fn(),
  recordDeletedCallbackIdentifiers: vi.fn(),
}));

vi.mock("../../src/api-lib/db-full", () => ({
  default: {
    dba: {
      collection: vi.fn(() => ({
        findOne: mocks.findOne,
        insertOne: mocks.insertOne,
      })),
      dbPromise: Promise.resolve({
        collection: vi.fn(() => ({ deleteMany: mocks.deleteMany })),
      }),
    },
  },
}));
vi.mock("../../src/server/account-data/requestTombstone", () => ({
  isDeletedCallbackIdentifier: mocks.isDeletedCallbackIdentifier,
  recordDeletedCallbackIdentifiers: mocks.recordDeletedCallbackIdentifiers,
}));

import csend from "../../pages/api/csend";

function response() {
  const res = { end: vi.fn(), status: vi.fn() };
  res.status.mockReturnValue(res);
  res.end.mockReturnValue(res);
  return res as unknown as NextApiResponse;
}

describe("POST /api/csend", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SIGN_KEY = "test-signing-key";
    mocks.isDeletedCallbackIdentifier.mockImplementation(
      async (_db, kind: string) => kind === "request",
    );
    mocks.recordDeletedCallbackIdentifiers.mockResolvedValue(1);
  });

  it("drops delayed callbacks for a deleted request and cleans its container", async () => {
    const signedData = {
      container_id: "late-container",
      payload: { startRequestId: "deleted-request" },
      status: "start",
      time: Date.now(),
      type: "inference",
    };
    const sig = crypto
      .createHash("md5")
      .update(JSON.stringify(signedData) + process.env.SIGN_KEY)
      .digest("hex");
    const req = {
      body: { ...signedData, sig },
      method: "POST",
      query: {},
    } as NextApiRequest;
    const res = response();

    await csend(req, res);

    expect(mocks.insertOne).not.toHaveBeenCalled();
    expect(
      mocks.recordDeletedCallbackIdentifiers,
    ).toHaveBeenCalledExactlyOnceWith(expect.any(Object), "container", [
      "late-container",
    ]);
    expect(mocks.deleteMany).toHaveBeenCalledExactlyOnceWith({
      container_id: "late-container",
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.end).toHaveBeenCalledWith("OK");
  });
});
