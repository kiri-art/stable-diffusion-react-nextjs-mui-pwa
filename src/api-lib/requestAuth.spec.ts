import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authOptions: { providers: [] },
  collection: vi.fn(),
  createAuthOptions: vi.fn(),
  findOne: vi.fn(),
  getServerSession: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: mocks.getServerSession,
}));

vi.mock("../../pages/api/auth/[...nextauth]", () => ({
  createAuthOptions: mocks.createAuthOptions,
}));

vi.mock("./db-full", () => ({
  default: {
    dba: {
      dbPromise: Promise.resolve({ collection: mocks.collection }),
    },
  },
}));

import {
  RequestAuthError,
  requireAdminUser,
  resolveAuthenticatedUserId,
} from "./requestAuth";

const req = {
  body: { sessionId: "body-session-override" },
  headers: {},
  query: { sessionId: "query-session-override" },
} as unknown as NextApiRequest;
const res = {} as NextApiResponse;

describe("request authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.collection.mockReturnValue({ findOne: mocks.findOne });
    mocks.createAuthOptions.mockReturnValue(mocks.authOptions);
  });

  it("resolves identity only through the request-aware NextAuth options", async () => {
    mocks.getServerSession.mockResolvedValue({ user: { id: "user-id" } });

    await expect(resolveAuthenticatedUserId(req, res)).resolves.toBe("user-id");

    expect(mocks.createAuthOptions).toHaveBeenCalledExactlyOnceWith(req);
    expect(mocks.getServerSession).toHaveBeenCalledExactlyOnceWith(
      req,
      res,
      mocks.authOptions,
    );
  });

  it("returns null when there is no authenticated NextAuth user", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    await expect(resolveAuthenticatedUserId(req, res)).resolves.toBeNull();
  });

  it("loads and returns the authenticated administrator from Mongo", async () => {
    const userId = new ObjectId();
    const admin = { _id: userId, admin: true };
    mocks.getServerSession.mockResolvedValue({
      user: { id: userId.toHexString() },
    });
    mocks.findOne.mockResolvedValue(admin);

    await expect(requireAdminUser(req, res)).resolves.toBe(admin);

    expect(mocks.collection).toHaveBeenCalledExactlyOnceWith("users");
    expect(mocks.findOne).toHaveBeenCalledExactlyOnceWith({ _id: userId });
  });

  it("rejects an authenticated non-administrator", async () => {
    const userId = new ObjectId();
    mocks.getServerSession.mockResolvedValue({
      user: { id: userId.toHexString() },
    });
    mocks.findOne.mockResolvedValue({ _id: userId, admin: false });

    await expect(requireAdminUser(req, res)).rejects.toEqual(
      new RequestAuthError(403, "Forbidden"),
    );
  });

  it("rejects unauthenticated requests without querying Mongo", async () => {
    mocks.getServerSession.mockResolvedValue(null);

    await expect(requireAdminUser(req, res)).rejects.toEqual(
      new RequestAuthError(401, "Unauthorized"),
    );
    expect(mocks.collection).not.toHaveBeenCalled();
  });
});
