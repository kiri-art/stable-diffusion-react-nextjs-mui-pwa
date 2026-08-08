import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class RequestAuthError extends Error {
    constructor(
      public readonly statusCode: 401 | 403,
      message: string,
    ) {
      super(message);
    }
  }

  class AccountDeletionConfigurationError extends Error {}
  class LastAdminDeletionError extends Error {
    constructor() {
      super("The final administrator account cannot be deleted");
    }
  }

  return {
    AccountDeletionConfigurationError,
    LastAdminDeletionError,
    RequestAuthError,
    client: { name: "mongo-client" },
    collection: vi.fn(),
    countDocuments: vi.fn(),
    createExternal: vi.fn(),
    deleteAccountData: vi.fn(),
    findOne: vi.fn(),
    resolveAuthenticatedUserId: vi.fn(),
  };
});

vi.mock("../../src/api-lib/db-full", () => ({
  default: {
    dba: {
      client: mocks.client,
      dbPromise: Promise.resolve({ collection: mocks.collection }),
    },
  },
}));
vi.mock("../../src/api-lib/requestAuth", () => ({
  RequestAuthError: mocks.RequestAuthError,
  resolveAuthenticatedUserId: mocks.resolveAuthenticatedUserId,
}));
vi.mock("../../src/server/account-data", () => ({
  AccountDeletionConfigurationError: mocks.AccountDeletionConfigurationError,
  deleteAccountData: mocks.deleteAccountData,
  LastAdminDeletionError: mocks.LastAdminDeletionError,
}));
vi.mock("../../src/server/account-data/external", () => ({
  createAccountDeletionExternalServices: mocks.createExternal,
}));

import myDataDelete from "../../pages/api/myDataDelete";

function response() {
  const res = {
    json: vi.fn(),
    setHeader: vi.fn(),
    status: vi.fn(),
  };
  res.status.mockReturnValue(res);
  res.json.mockReturnValue(res);
  return res as unknown as NextApiResponse;
}

function request(overrides: Partial<NextApiRequest> = {}): NextApiRequest {
  return {
    body: { confirmation: "PERMANENTLY ERASE MY DATA" },
    headers: { "x-kiri-account-action": "delete" },
    method: "POST",
    ...overrides,
  } as NextApiRequest;
}

describe("POST /api/myDataDelete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.collection.mockReturnValue({
      countDocuments: mocks.countDocuments,
      findOne: mocks.findOne,
    });
    mocks.findOne.mockResolvedValue({ admin: false });
    mocks.countDocuments.mockResolvedValue(2);
    mocks.createExternal.mockReturnValue({ external: true });
    mocks.deleteAccountData.mockResolvedValue({
      collections: [],
      resources: [],
      status: "complete",
      targetUserId: "target",
    });
  });

  it("returns a structured 405 response and Allow header for other methods", async () => {
    const res = response();

    await myDataDelete(request({ method: "GET" }), res);

    expect(res.setHeader).toHaveBeenCalledWith("Allow", "POST");
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: "METHOD_NOT_ALLOWED",
        message: "Only POST is allowed",
      },
    });
    expect(mocks.resolveAuthenticatedUserId).not.toHaveBeenCalled();
  });

  it("requires both the deliberate action header and exact confirmation", async () => {
    const headerResponse = response();
    await myDataDelete(request({ headers: {} }), headerResponse);
    expect(headerResponse.status).toHaveBeenCalledWith(400);
    expect(headerResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: "ACTION_HEADER_REQUIRED" }),
      }),
    );

    const confirmationResponse = response();
    await myDataDelete(
      request({ body: { confirmation: "delete" } }),
      confirmationResponse,
    );
    expect(confirmationResponse.status).toHaveBeenCalledWith(400);
    expect(confirmationResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: "CONFIRMATION_REQUIRED" }),
      }),
    );
    expect(mocks.resolveAuthenticatedUserId).not.toHaveBeenCalled();
  });

  it("derives the target only from authenticated identity and returns the report", async () => {
    const userId = new ObjectId();
    const external = { external: true };
    const report = {
      collections: [{ name: "users", action: "deleted", affectedRows: 1 }],
      resources: [],
      status: "complete",
      targetUserId: userId.toHexString(),
    };
    mocks.resolveAuthenticatedUserId.mockResolvedValue(userId.toHexString());
    mocks.createExternal.mockReturnValue(external);
    mocks.deleteAccountData.mockResolvedValue(report);
    const res = response();

    await myDataDelete(
      request({
        body: {
          confirmation: "PERMANENTLY ERASE MY DATA",
          targetUserId: new ObjectId().toHexString(),
        },
        query: { targetUserId: new ObjectId().toHexString() },
      }),
      res,
    );

    expect(mocks.deleteAccountData).toHaveBeenCalledExactlyOnceWith({
      db: expect.any(Object),
      client: mocks.client,
      targetUserId: userId,
      external,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(report);
  });

  it("blocks deletion of the final administrator", async () => {
    const userId = new ObjectId();
    mocks.resolveAuthenticatedUserId.mockResolvedValue(userId.toHexString());
    mocks.findOne.mockResolvedValue({ admin: true });
    mocks.countDocuments.mockResolvedValue(1);
    const res = response();

    await myDataDelete(request(), res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: "LAST_ADMIN" }),
      }),
    );
    expect(mocks.deleteAccountData).not.toHaveBeenCalled();
  });

  it("maps the transactional last-admin guard to conflict", async () => {
    const userId = new ObjectId();
    mocks.resolveAuthenticatedUserId.mockResolvedValue(userId.toHexString());
    mocks.deleteAccountData.mockRejectedValue(
      new mocks.LastAdminDeletionError(),
    );
    const res = response();

    await myDataDelete(request(), res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: "LAST_ADMIN",
        message: "The final administrator account cannot be deleted",
      },
    });
  });

  it("maps an unsupported Mongo topology to a generic unavailable response", async () => {
    const userId = new ObjectId();
    mocks.resolveAuthenticatedUserId.mockResolvedValue(userId.toHexString());
    mocks.deleteAccountData.mockRejectedValue(
      new mocks.AccountDeletionConfigurationError("internal detail"),
    );
    const res = response();

    await myDataDelete(request(), res);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: "ACCOUNT_DELETION_UNAVAILABLE",
        message: "Account deletion is temporarily unavailable",
      },
    });
  });
});
