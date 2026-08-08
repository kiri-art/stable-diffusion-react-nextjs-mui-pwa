import { createHash } from "node:crypto";
import type { ClientSession, Db } from "mongodb";

const CALLBACK_TOMBSTONE_LIFETIME_MS = 30 * 24 * 60 * 60 * 1_000;

type CallbackIdentifierKind = "container" | "request";

function callbackIdentifierId(kind: CallbackIdentifierKind, value: string) {
  const digest = createHash("sha256").update(value).digest("hex");
  return `${kind}:${digest}`;
}

export async function recordDeletedCallbackIdentifiers(
  db: Db,
  kind: CallbackIdentifierKind,
  values: string[],
  session?: ClientSession,
): Promise<number> {
  const uniqueValues = Array.from(new Set(values.filter(Boolean)));
  if (!uniqueValues.length) return 0;

  const expiresAt = new Date(Date.now() + CALLBACK_TOMBSTONE_LIFETIME_MS);
  const result = await db
    .collection("accountDeletionCallbackTombstones")
    .bulkWrite(
      uniqueValues.map((value) => ({
        updateOne: {
          filter: { _id: callbackIdentifierId(kind, value) } as never,
          update: {
            $set: { expiresAt, kind },
            $setOnInsert: { createdAt: new Date() },
          },
          upsert: true,
        },
      })),
      { ordered: false, session },
    );
  return result.upsertedCount + result.modifiedCount;
}

export async function isDeletedCallbackIdentifier(
  db: Db,
  kind: CallbackIdentifierKind,
  value: string,
): Promise<boolean> {
  const tombstone = await db
    .collection("accountDeletionCallbackTombstones")
    .findOne(
      {
        _id: callbackIdentifierId(kind, value),
        expiresAt: { $gt: new Date() },
      } as never,
      { projection: { _id: 1 } },
    );
  return Boolean(tombstone);
}
