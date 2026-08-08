import { ObjectId } from "bson";
import type { NextApiRequest } from "next";
import type { Session } from "next-auth";
import type { AdapterUser } from "next-auth/adapters";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  collection: vi.fn(),
  ipFromReq: vi.fn(),
  updateOne: vi.fn(),
}));

vi.mock("next-auth", () => ({ default: vi.fn() }));
vi.mock("next-auth/providers/google", () => ({
  default: vi.fn(() => ({ id: "google", type: "oauth" })),
}));
vi.mock("next-auth/providers/twitter", () => ({
  default: vi.fn(() => ({ id: "twitter", type: "oauth" })),
}));
vi.mock("./GithubProvider", () => ({
  default: vi.fn(() => ({ id: "github", type: "oauth" })),
}));
vi.mock("./gongoAuthAdapter", () => ({
  default: vi.fn(() => ({})),
}));
vi.mock("./db-full", () => ({
  default: { dba: { collection: mocks.collection } },
}));
vi.mock("./ipCheck", () => ({ ipFromReq: mocks.ipFromReq }));

import { createAuthOptions } from "../../pages/api/auth/[...nextauth]";

describe("request-aware NextAuth options", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.collection.mockReturnValue({ updateOne: mocks.updateOne });
    mocks.ipFromReq.mockReturnValue("203.0.113.10");
  });

  it("adds the user ID and persists request metadata during session lookup", async () => {
    const userId = new ObjectId();
    const expires = new Date(Date.now() + 60_000).toISOString();
    const req = {
      headers: { "user-agent": "test-agent" },
    } as NextApiRequest;
    const session: Session = {
      expires,
      ip: "",
      user: { id: "", email: "user@example.test" },
    };
    const user: AdapterUser = {
      id: userId.toHexString(),
      email: "user@example.test",
      emailVerified: null,
    };
    const sessionCallback = createAuthOptions(req).callbacks?.session;
    if (!sessionCallback) throw new Error("Missing session callback");

    await expect(
      sessionCallback({
        newSession: undefined,
        session,
        token: {},
        trigger: "update",
        user,
      }),
    ).resolves.toBe(session);

    expect(session.user.id).toBe(user.id);
    expect(mocks.ipFromReq).toHaveBeenCalledExactlyOnceWith(req);
    expect(mocks.collection).toHaveBeenCalledExactlyOnceWith("sessions");
    expect(mocks.updateOne).toHaveBeenCalledExactlyOnceWith(
      { expires: new Date(expires), userId },
      {
        $set: {
          ip: "203.0.113.10",
          userAgent: "test-agent",
        },
      },
    );
  });
});
