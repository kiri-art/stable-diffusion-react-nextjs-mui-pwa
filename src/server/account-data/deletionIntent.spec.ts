import { describe, expect, it } from "vitest";

import {
  createDeletionIntent,
  DELETION_INTENT_VERSION,
  DeletionIntentError,
  verifyDeletionIntent,
} from "./deletionIntent";

const actorUserId = "admin-user-id";
const targetUserId = "target-user-id";
const secret = "a-test-secret-that-is-not-read-from-the-environment";
const now = 2_000_000_000_000;
const expiresAt = now + 5 * 60 * 1_000;

function createToken(): string {
  return createDeletionIntent({
    actorUserId,
    targetUserId,
    expiresAt,
    secret,
  });
}

function verify(token: string) {
  return verifyDeletionIntent(token, {
    actorUserId,
    targetUserId,
    secret,
    now,
  });
}

describe("account-deletion intents", () => {
  it("creates a signed base64url token and verifies its payload", () => {
    const token = createToken();
    const [encodedPayload, encodedSignature] = token.split(".");

    expect(encodedPayload).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(encodedSignature).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(
      JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")),
    ).toEqual({
      actorUserId,
      targetUserId,
      expiresAt,
      version: DELETION_INTENT_VERSION,
    });
    expect(verify(token)).toEqual({
      actorUserId,
      targetUserId,
      expiresAt,
      version: DELETION_INTENT_VERSION,
    });
  });

  it.each([
    "",
    "not-a-token",
    "too.many.token.parts",
    "invalid payload.invalid signature",
    "e30=._w",
  ])("rejects a malformed token: %s", (token) => {
    expect(() => verify(token)).toThrow(DeletionIntentError);
  });

  it("rejects a tampered payload", () => {
    const token = createToken();
    const [encodedPayload, signature] = token.split(".");
    const payload = JSON.parse(
      Buffer.from(encodedPayload, "base64url").toString("utf8"),
    );
    payload.targetUserId = "attacker-selected-user-id";
    const tamperedPayload = Buffer.from(
      JSON.stringify(payload),
      "utf8",
    ).toString("base64url");

    expect(() => verify(`${tamperedPayload}.${signature}`)).toThrow(
      DeletionIntentError,
    );
  });

  it("rejects a tampered signature and a different secret", () => {
    const token = createToken();
    const [encodedPayload, signature] = token.split(".");
    const replacement = signature.endsWith("A") ? "B" : "A";
    const tamperedSignature = `${signature.slice(0, -1)}${replacement}`;

    expect(() => verify(`${encodedPayload}.${tamperedSignature}`)).toThrow(
      DeletionIntentError,
    );
    expect(() =>
      verifyDeletionIntent(token, {
        actorUserId,
        targetUserId,
        secret: "a-different-secret",
        now,
      }),
    ).toThrow(DeletionIntentError);
  });

  it("rejects an intent at and after its expiry", () => {
    const token = createToken();

    expect(() =>
      verifyDeletionIntent(token, {
        actorUserId,
        targetUserId,
        secret,
        now: expiresAt,
      }),
    ).toThrow(DeletionIntentError);
    expect(() =>
      verifyDeletionIntent(token, {
        actorUserId,
        targetUserId,
        secret,
        now: expiresAt + 1,
      }),
    ).toThrow(DeletionIntentError);
  });

  it("rejects an actor mismatch", () => {
    expect(() =>
      verifyDeletionIntent(createToken(), {
        actorUserId: "different-admin-user-id",
        targetUserId,
        secret,
        now,
      }),
    ).toThrow(DeletionIntentError);
  });

  it("rejects a target mismatch", () => {
    expect(() =>
      verifyDeletionIntent(createToken(), {
        actorUserId,
        targetUserId: "different-target-user-id",
        secret,
        now,
      }),
    ).toThrow(DeletionIntentError);
  });

  it("rejects invalid creation input", () => {
    expect(() =>
      createDeletionIntent({
        actorUserId: "",
        targetUserId,
        expiresAt,
        secret,
      }),
    ).toThrow(TypeError);
    expect(() =>
      createDeletionIntent({
        actorUserId,
        targetUserId,
        expiresAt,
        secret: "",
      }),
    ).toThrow(TypeError);
  });
});
