import crypto from "node:crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const findOne = vi.fn();
  const insertOne = vi.fn();
  return {
    collection: vi.fn(() => ({ findOne, insertOne })),
    findOne,
    insertOne,
  };
});

vi.mock("../../src/api-lib/db-full", () => ({
  default: {
    dba: {
      collection: mocks.collection,
      dbPromise: Promise.resolve({
        collection: vi.fn((name: string) => {
          if (name === "userRequests") {
            throw new Error("provider telemetry touched account data");
          }
          return {};
        }),
      }),
    },
  },
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
  });

  it("records signed telemetry without consulting account-linked data", async () => {
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

    expect(mocks.insertOne).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        container_id: "late-container",
        payload: { startRequestId: "deleted-request" },
      }),
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.end).toHaveBeenCalledWith("OK");
  });
});
