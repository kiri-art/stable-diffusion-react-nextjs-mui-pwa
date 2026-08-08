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

  class DeletionIntentError extends Error {}
  class AccountDeletionConfigurationError extends Error {}
  class AccountDeletionJobNotFoundError extends Error {}
  class LastAdminDeletionError extends Error {
    constructor() {
      super("The final administrator account cannot be deleted");
    }
  }

  return {
    AccountDeletionConfigurationError,
    AccountDeletionJobNotFoundError,
    DeletionIntentError,
    LastAdminDeletionError,
    RequestAuthError,
    client: { name: "mongo-client" },
    collection: vi.fn(),
    countDocuments: vi.fn(),
    createDeletionIntent: vi.fn(),
    createExternal: vi.fn(),
    deleteAccountData: vi.fn(),
    find: vi.fn(),
    findOne: vi.fn(),
    limit: vi.fn(),
    previewAccountDeletion: vi.fn(),
    requireAdminUser: vi.fn(),
    retryAccountDeletionJob: vi.fn(),
    toArray: vi.fn(),
    verifyDeletionIntent: vi.fn(),
  };
});

vi.mock("../../../src/api-lib/db-full", () => ({
  default: {
    dba: {
      client: mocks.client,
      dbPromise: Promise.resolve({ collection: mocks.collection }),
    },
  },
}));
vi.mock("../../../src/api-lib/requestAuth", () => ({
  RequestAuthError: mocks.RequestAuthError,
  requireAdminUser: mocks.requireAdminUser,
}));
vi.mock("../../../src/server/account-data", () => ({
  AccountDeletionConfigurationError: mocks.AccountDeletionConfigurationError,
  AccountDeletionJobNotFoundError: mocks.AccountDeletionJobNotFoundError,
  deleteAccountData: mocks.deleteAccountData,
  LastAdminDeletionError: mocks.LastAdminDeletionError,
  previewAccountDeletion: mocks.previewAccountDeletion,
  retryAccountDeletionJob: mocks.retryAccountDeletionJob,
}));
vi.mock("../../../src/server/account-data/deletionIntent", () => ({
  createDeletionIntent: mocks.createDeletionIntent,
  DeletionIntentError: mocks.DeletionIntentError,
  verifyDeletionIntent: mocks.verifyDeletionIntent,
}));
vi.mock("../../../src/server/account-data/external", () => ({
  createAccountDeletionExternalServices: mocks.createExternal,
}));

import accountDeletion from "../../../pages/api/admin/accountDeletion";

const actorUserId = new ObjectId();

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

function request(
  body: Record<string, unknown>,
  overrides: Partial<NextApiRequest> = {},
): NextApiRequest {
  return {
    body,
    headers: {},
    method: "POST",
    ...overrides,
  } as NextApiRequest;
}

describe("POST /api/admin/accountDeletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = "test-nextauth-secret";

    const cursor = {
      limit: mocks.limit,
      toArray: mocks.toArray,
    };
    mocks.limit.mockReturnValue(cursor);
    mocks.find.mockReturnValue(cursor);
    mocks.collection.mockReturnValue({
      countDocuments: mocks.countDocuments,
      find: mocks.find,
      findOne: mocks.findOne,
    });
    mocks.requireAdminUser.mockResolvedValue({
      _id: actorUserId,
      admin: true,
    });
    mocks.countDocuments.mockResolvedValue(2);
    mocks.createDeletionIntent.mockReturnValue("signed-intent");
    mocks.createExternal.mockReturnValue({ external: true });
    mocks.previewAccountDeletion.mockResolvedValue({
      collections: [],
      resources: [],
      status: "complete",
      targetUserId: "target",
    });
    mocks.retryAccountDeletionJob.mockResolvedValue({
      collections: [],
      resources: [],
      status: "complete",
      targetUserId: "deleted-target",
    });
  });

  it("authenticates before dispatch and preserves RequestAuthError status", async () => {
    mocks.requireAdminUser.mockRejectedValue(
      new mocks.RequestAuthError(403, "Forbidden"),
    );
    const res = response();

    await accountDeletion(request({}, { method: "GET" }), res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: { code: "FORBIDDEN", message: "Forbidden" },
    });
    expect(res.setHeader).not.toHaveBeenCalledWith("Allow", "POST");
  });

  it("returns 405 with Allow after authenticating an administrator", async () => {
    const res = response();

    await accountDeletion(request({}, { method: "GET" }), res);

    expect(mocks.requireAdminUser).toHaveBeenCalledTimes(1);
    expect(res.setHeader).toHaveBeenCalledWith("Allow", "POST");
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it("searches exact escaped case-insensitive emails and returns duplicate matches safely", async () => {
    const firstUserId = new ObjectId();
    const secondUserId = new ObjectId();
    mocks.toArray.mockResolvedValue([
      {
        _id: firstUserId,
        admin: false,
        createdAt: new Date("2024-01-01T00:00:00.000Z"),
        displayName: "First user",
        emails: [
          { value: "other@example.com" },
          { value: "Plus+Tag@example.com" },
        ],
      },
      {
        _id: secondUserId,
        admin: true,
        displayName: "Second user",
        email: "plus+tag@example.com",
      },
    ]);
    const res = response();

    await accountDeletion(
      request({ action: "search", query: "plus+tag@example.com" }),
      res,
    );

    expect(mocks.find).toHaveBeenCalledTimes(1);
    const [filter, options] = mocks.find.mock.calls[0];
    const emailPattern = filter.$or[0]["emails.value"] as RegExp;
    expect(emailPattern.flags).toContain("i");
    expect(emailPattern.test("PLUS+TAG@EXAMPLE.COM")).toBe(true);
    expect(emailPattern.test("plusssss+tag@example.com")).toBe(false);
    expect(filter.$or[1].email).toEqual(emailPattern);
    expect(options.projection).toEqual({
      _id: 1,
      admin: 1,
      createdAt: 1,
      displayName: 1,
      email: 1,
      "emails.value": 1,
    });
    expect(mocks.limit).toHaveBeenCalledExactlyOnceWith(10);
    expect(res.json).toHaveBeenCalledWith({
      results: [
        {
          id: firstUserId.toHexString(),
          email: "Plus+Tag@example.com",
          displayName: "First user",
          createdAt: "2024-01-01T00:00:00.000Z",
          admin: false,
        },
        {
          id: secondUserId.toHexString(),
          email: "plus+tag@example.com",
          displayName: "Second user",
          createdAt: null,
          admin: true,
        },
      ],
    });
  });

  it("rejects oversized searches before constructing a database query", async () => {
    const res = response();

    await accountDeletion(
      request({ action: "search", query: "a".repeat(321) }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: "SEARCH_QUERY_TOO_LONG",
        message: "Search queries cannot exceed 320 characters",
      },
    });
    expect(mocks.find).not.toHaveBeenCalled();
  });

  it("blocks an administrator from targeting themselves in preview", async () => {
    const res = response();

    await accountDeletion(
      request({
        action: "preview",
        targetUserId: actorUserId.toHexString(),
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: "SELF_DELETION_NOT_ALLOWED",
        }),
      }),
    );
    expect(mocks.previewAccountDeletion).not.toHaveBeenCalled();
  });

  it("verifies an ID-bound intent, re-checks the target, and returns the deletion report", async () => {
    const targetUserId = new ObjectId();
    const target = {
      _id: targetUserId,
      admin: false,
      displayName: "Target user",
      emails: [{ value: "target@example.com" }],
    };
    const external = { external: true };
    const report = {
      collections: [{ name: "users", action: "deleted", affectedRows: 1 }],
      resources: [],
      status: "complete",
      targetUserId: targetUserId.toHexString(),
    };
    mocks.findOne.mockResolvedValue(target);
    mocks.createExternal.mockReturnValue(external);
    mocks.deleteAccountData.mockResolvedValue(report);
    const res = response();

    await accountDeletion(
      request(
        {
          action: "delete",
          confirmation: `DELETE ${targetUserId.toHexString()}`,
          intent: "signed-intent",
          targetUserId: targetUserId.toHexString(),
        },
        { headers: { "x-kiri-account-action": "admin-delete" } },
      ),
      res,
    );

    expect(mocks.verifyDeletionIntent).toHaveBeenCalledExactlyOnceWith(
      "signed-intent",
      {
        actorUserId: actorUserId.toHexString(),
        targetUserId: targetUserId.toHexString(),
        secret: "test-nextauth-secret",
      },
    );
    expect(mocks.findOne).toHaveBeenCalledWith(
      { _id: targetUserId },
      { projection: expect.any(Object) },
    );
    expect(mocks.deleteAccountData).toHaveBeenCalledExactlyOnceWith({
      db: expect.any(Object),
      client: mocks.client,
      targetUserId,
      external,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(report);
  });

  it("re-checks and blocks deletion when the target has become the final admin", async () => {
    const targetUserId = new ObjectId();
    mocks.findOne.mockResolvedValue({ _id: targetUserId, admin: true });
    mocks.countDocuments.mockResolvedValue(1);
    const res = response();

    await accountDeletion(
      request(
        {
          action: "delete",
          confirmation: `DELETE ${targetUserId.toHexString()}`,
          intent: "signed-intent",
          targetUserId: targetUserId.toHexString(),
        },
        { headers: { "x-kiri-account-action": "admin-delete" } },
      ),
      res,
    );

    expect(mocks.verifyDeletionIntent).toHaveBeenCalledTimes(1);
    expect(mocks.countDocuments).toHaveBeenCalledWith({ admin: true });
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: "LAST_ADMIN" }),
      }),
    );
    expect(mocks.deleteAccountData).not.toHaveBeenCalled();
  });

  it("maps the transactional last-admin guard to conflict", async () => {
    const targetUserId = new ObjectId();
    mocks.findOne.mockResolvedValue({ _id: targetUserId, admin: false });
    mocks.deleteAccountData.mockRejectedValue(
      new mocks.LastAdminDeletionError(),
    );
    const res = response();

    await accountDeletion(
      request(
        {
          action: "delete",
          confirmation: `DELETE ${targetUserId.toHexString()}`,
          intent: "signed-intent",
          targetUserId: targetUserId.toHexString(),
        },
        { headers: { "x-kiri-account-action": "admin-delete" } },
      ),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: "LAST_ADMIN",
        message: "The final administrator account cannot be deleted",
      },
    });
  });

  it("maps an unsupported Mongo topology to a generic unavailable response", async () => {
    const targetUserId = new ObjectId();
    mocks.findOne.mockResolvedValue({ _id: targetUserId, admin: false });
    mocks.deleteAccountData.mockRejectedValue(
      new mocks.AccountDeletionConfigurationError("internal detail"),
    );
    const res = response();

    await accountDeletion(
      request(
        {
          action: "delete",
          confirmation: `DELETE ${targetUserId.toHexString()}`,
          intent: "signed-intent",
          targetUserId: targetUserId.toHexString(),
        },
        { headers: { "x-kiri-account-action": "admin-delete" } },
      ),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: "ACCOUNT_DELETION_UNAVAILABLE",
        message: "Account deletion is temporarily unavailable",
      },
    });
  });

  it("retries an exact deletion job only with the dedicated header and confirmation", async () => {
    const deletionId = new ObjectId();
    const external = { external: true };
    const report = {
      collections: [],
      resources: [{ action: "deleted", affectedRows: 1, name: "s3" }],
      status: "complete",
      targetUserId: "deleted-target",
    };
    mocks.createExternal.mockReturnValue(external);
    mocks.retryAccountDeletionJob.mockResolvedValue(report);
    const res = response();

    await accountDeletion(
      request(
        {
          action: "retry",
          confirmation: `RETRY ${deletionId.toHexString()}`,
          deletionId: deletionId.toHexString(),
        },
        { headers: { "x-kiri-account-action": "admin-delete-retry" } },
      ),
      res,
    );

    expect(mocks.retryAccountDeletionJob).toHaveBeenCalledExactlyOnceWith({
      client: mocks.client,
      db: expect.any(Object),
      deletionId,
      external,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(report);
  });

  it("does not retry without the exact job-bound confirmation", async () => {
    const deletionId = new ObjectId();
    const res = response();

    await accountDeletion(
      request(
        {
          action: "retry",
          confirmation: "RETRY a-different-job",
          deletionId: deletionId.toHexString(),
        },
        { headers: { "x-kiri-account-action": "admin-delete-retry" } },
      ),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: "CONFIRMATION_REQUIRED" }),
      }),
    );
    expect(mocks.retryAccountDeletionJob).not.toHaveBeenCalled();
  });

  it("does not retry through the ordinary account-delete action header", async () => {
    const deletionId = new ObjectId();
    const res = response();

    await accountDeletion(
      request(
        {
          action: "retry",
          confirmation: `RETRY ${deletionId.toHexString()}`,
          deletionId: deletionId.toHexString(),
        },
        { headers: { "x-kiri-account-action": "admin-delete" } },
      ),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ code: "ACTION_HEADER_REQUIRED" }),
      }),
    );
    expect(mocks.retryAccountDeletionJob).not.toHaveBeenCalled();
  });

  it("returns not found after a deletion job has already converged", async () => {
    const deletionId = new ObjectId();
    mocks.retryAccountDeletionJob.mockRejectedValue(
      new mocks.AccountDeletionJobNotFoundError(),
    );
    const res = response();

    await accountDeletion(
      request(
        {
          action: "retry",
          confirmation: `RETRY ${deletionId.toHexString()}`,
          deletionId: deletionId.toHexString(),
        },
        { headers: { "x-kiri-account-action": "admin-delete-retry" } },
      ),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        code: "DELETION_JOB_NOT_FOUND",
        message: "No pending account-deletion job exists with that ID",
      },
    });
  });
});
