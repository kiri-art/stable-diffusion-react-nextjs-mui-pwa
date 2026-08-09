import type { Db, Document } from "mongodb";

export const ACCOUNT_USAGE_SCHEMA_VERSION = 2;
export const ACCOUNT_USAGE_COLLECTION = "userRequests";

export interface ChargedCredits {
  credits: number;
  paid: boolean;
}

export interface DailyAccountUsageInput extends ChargedCredits {
  date?: Date;
  userId: unknown;
}

export interface HistoricalUnlinkReport {
  accountDays: number;
  applied: boolean;
  legacyIdentifierDocuments: number;
  missingDateDocuments: number;
  orphanDocumentsRemoved: number;
  sourceDocuments: number;
}

/**
 * Account-side usage is deliberately rounded to a UTC day. Persisting an exact
 * generation time beside a user ID would recreate a practical join to the raw
 * provider logs even without sharing a request ID.
 */
export function accountUsageDay(date = new Date()): Date {
  if (Number.isNaN(date.getTime())) throw new RangeError("Invalid usage date");
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

/** Build the only account-linked write allowed for a generation. */
export function dailyAccountUsageUpsert({
  credits,
  date = new Date(),
  paid,
  userId,
}: DailyAccountUsageInput) {
  const usageDate = accountUsageDay(date);
  return {
    filter: { _id: { date: usageDate, userId } },
    options: { upsert: true },
    update: {
      $inc: {
        credits,
        freeCredits: paid ? 0 : credits,
        paidCredits: paid ? credits : 0,
        requests: 1,
      },
      $set: {
        date: usageDate,
        schemaVersion: ACCOUNT_USAGE_SCHEMA_VERSION,
        userId,
      },
    },
  };
}

/**
 * Rebuild legacy per-request rows as a strict, whitelisted daily ledger.
 * `$out` atomically replaces the collection and intentionally leaves no backup
 * containing the old join fields.
 */
export function historicalAccountUsagePipeline(): Document[] {
  const numericOr = (
    field: string,
    fallback: number | string | Document,
  ): Document => ({
    $cond: [{ $isNumber: field }, field, fallback],
  });
  const credits = numericOr("$credits", 0);
  const requests = numericOr("$requests", 1);
  const paidCredits = numericOr("$paidCredits", {
    $cond: [{ $eq: ["$paid", true] }, credits, 0],
  });
  const freeCredits = numericOr("$freeCredits", {
    $cond: [{ $eq: ["$paid", true] }, 0, credits],
  });

  return [
    { $match: { userId: { $exists: true, $ne: null } } },
    {
      $project: {
        credits,
        freeCredits,
        paidCredits,
        requests,
        sourceDate: {
          $convert: {
            input: "$date",
            onError: null,
            onNull: null,
            to: "date",
          },
        },
        userId: 1,
      },
    },
    {
      $project: {
        credits: 1,
        freeCredits: 1,
        paidCredits: 1,
        requests: 1,
        usageDate: {
          $dateTrunc: {
            date: { $ifNull: ["$sourceDate", new Date(0)] },
            timezone: "UTC",
            unit: "day",
          },
        },
        userId: 1,
      },
    },
    {
      $group: {
        _id: { date: "$usageDate", userId: "$userId" },
        credits: { $sum: "$credits" },
        freeCredits: { $sum: "$freeCredits" },
        paidCredits: { $sum: "$paidCredits" },
        requests: { $sum: "$requests" },
      },
    },
    {
      $project: {
        _id: 1,
        credits: 1,
        date: "$_id.date",
        freeCredits: 1,
        paidCredits: 1,
        requests: 1,
        schemaVersion: { $literal: ACCOUNT_USAGE_SCHEMA_VERSION },
        userId: "$_id.userId",
      },
    },
  ];
}

export async function unlinkHistoricalProviderLogs(
  db: Db,
  { apply = false }: { apply?: boolean } = {},
): Promise<HistoricalUnlinkReport> {
  const collection = db.collection(ACCOUNT_USAGE_COLLECTION);
  const legacyFilter = {
    $or: [
      { callID: { $exists: true } },
      { callInputs: { $exists: true } },
      { modelInputs: { $exists: true } },
      { startRequestId: { $exists: true } },
    ],
  };
  const [sourceDocuments, legacyIdentifierDocuments, missingDateDocuments] =
    await Promise.all([
      collection.countDocuments(),
      collection.countDocuments(legacyFilter),
      collection.countDocuments({
        userId: { $exists: true, $ne: null },
        $or: [{ date: { $exists: false } }, { date: null }],
      }),
    ]);
  const orphanDocuments = await collection.countDocuments({
    $or: [{ userId: { $exists: false } }, { userId: null }],
  });
  const countResult = await collection
    .aggregate<{ accountDays: number }>([
      ...historicalAccountUsagePipeline(),
      { $count: "accountDays" },
    ])
    .toArray();
  const accountDays = countResult[0]?.accountDays ?? 0;

  if (apply) {
    await collection
      .aggregate(
        [
          ...historicalAccountUsagePipeline(),
          { $out: ACCOUNT_USAGE_COLLECTION },
        ],
        { allowDiskUse: true },
      )
      .toArray();

    const legacyIndexNames = new Set([
      "userRequests_callInputs_startRequestId",
      "userRequests_date_userId",
      "userRequests_startRequestId",
    ]);
    for (const index of await collection.indexes()) {
      if (legacyIndexNames.has(index.name || "")) {
        await collection.dropIndex(index.name as string);
      }
    }
    await collection.createIndex(
      { date: 1, userId: 1 },
      { name: "userRequests_date_userId", unique: true },
    );
  }

  return {
    accountDays,
    applied: apply,
    legacyIdentifierDocuments,
    missingDateDocuments,
    orphanDocumentsRemoved: apply ? orphanDocuments : 0,
    sourceDocuments,
  };
}
