import type { NextApiRequest, NextApiResponse } from "next";

import gs from "../../src/api-lib/db-full";

type IndexKey = Record<string, 1 | -1>;

type ManagedIndex = {
  collection: string;
  key: IndexKey;
  name: string;
};

type IndexResult =
  | (ManagedIndex & {
      status:
        | "exists"
        | "exists_with_different_name"
        | "created"
        | "would_create";
      existingName?: string;
    })
  | (ManagedIndex & {
      status: "conflict" | "error";
      existing?: unknown;
      error?: string;
    });

const managedIndexes: ManagedIndex[] = [
  {
    collection: "bananaRequests",
    key: { createdAt: -1 },
    name: "bananaRequests_createdAt_desc",
  },
  {
    collection: "bananaRequests",
    key: { "callInputs.MODEL_ID": 1, createdAt: -1 },
    name: "bananaRequests_modelId_createdAt",
  },
  {
    collection: "bananaRequests",
    key: { callID: 1 },
    name: "bananaRequests_callID",
  },
  {
    collection: "bananaRequests",
    key: { startRequestId: 1 },
    name: "bananaRequests_startRequestId",
  },
  {
    collection: "userRequests",
    key: { date: 1, userId: 1 },
    name: "userRequests_date_userId",
  },
  {
    collection: "userRequests",
    key: { userId: 1 },
    name: "userRequests_userId",
  },
  {
    collection: "userRequests",
    key: { startRequestId: 1 },
    name: "userRequests_startRequestId",
  },
  {
    collection: "userRequests",
    key: { "callInputs.startRequestId": 1 },
    name: "userRequests_callInputs_startRequestId",
  },
  {
    collection: "users",
    key: { createdAt: 1 },
    name: "users_createdAt",
  },
  {
    collection: "users",
    key: { username: 1 },
    name: "users_username",
  },
  {
    collection: "users",
    key: { "emails.value": 1 },
    name: "users_email_value",
  },
  {
    collection: "users",
    key: { email: 1 },
    name: "users_email",
  },
  {
    collection: "users",
    key: { stripeCustomerId: 1 },
    name: "users_stripeCustomerId",
  },
  {
    collection: "users",
    key: { "services.service": 1, "services.id": 1 },
    name: "users_legacy_services",
  },
  {
    collection: "users",
    key: { __updatedAt: 1 },
    name: "users_updatedAt",
  },
  {
    collection: "users",
    key: { admin: 1 },
    name: "users_admin",
  },
  {
    collection: "statsDaily",
    key: { date: 1 },
    name: "statsDaily_date",
  },
  {
    collection: "statsHourly",
    key: { date: 1 },
    name: "statsHourly_date",
  },
  {
    collection: "stars",
    key: { date: -1 },
    name: "stars_date_desc",
  },
  {
    collection: "stars",
    key: { likes: -1 },
    name: "stars_likes_desc",
  },
  {
    collection: "stars",
    key: { userId: 1, date: -1 },
    name: "stars_userId_date_desc",
  },
  {
    collection: "stars",
    key: { "callInputs.safety_checker": 1, date: -1 },
    name: "stars_safety_date_desc",
  },
  {
    collection: "stars",
    key: { "callInputs.safety_checker": 1, likes: -1 },
    name: "stars_safety_likes_desc",
  },
  {
    collection: "stars",
    key: { __updatedAt: 1 },
    name: "stars_updatedAt",
  },
  {
    collection: "stars",
    key: { "files.output": 1 },
    name: "stars_files_output",
  },
  {
    collection: "stars",
    key: { "files.init": 1 },
    name: "stars_files_init",
  },
  {
    collection: "stars",
    key: { "files.mask": 1 },
    name: "stars_files_mask",
  },
  {
    collection: "likes",
    key: { userId: 1 },
    name: "likes_userId",
  },
  {
    collection: "likes",
    key: { starId: 1, userId: 1 },
    name: "likes_starId_userId",
  },
  {
    collection: "reportedStars",
    key: { userId: 1 },
    name: "reportedStars_userId",
  },
  {
    collection: "reportedStars",
    key: { starId: 1 },
    name: "reportedStars_starId",
  },
  {
    collection: "orders",
    key: { userId: 1, createdAt: -1 },
    name: "orders_userId_createdAt",
  },
  {
    collection: "orders",
    key: { stripePaymentIntentId: 1 },
    name: "orders_stripePaymentIntentId",
  },
  {
    collection: "creditCodes",
    key: { name: 1 },
    name: "creditCodes_name",
  },
  {
    collection: "sessions",
    key: { sessionToken: 1 },
    name: "sessions_sessionToken",
  },
  {
    collection: "sessions",
    key: { userId: 1, expires: 1 },
    name: "sessions_userId_expires",
  },
  {
    collection: "accounts",
    key: { provider: 1, providerAccountId: 1 },
    name: "accounts_provider_providerAccountId",
  },
  {
    collection: "accounts",
    key: { userId: 1 },
    name: "accounts_userId",
  },
  {
    collection: "accountDeletionJobs",
    key: { updatedAt: 1, attempts: 1 },
    name: "accountDeletionJobs_updatedAt_attempts",
  },
  {
    collection: "verification_tokens",
    key: { identifier: 1 },
    name: "verification_tokens_identifier",
  },
  {
    collection: "verification_tokens",
    key: { email: 1 },
    name: "verification_tokens_email",
  },
  {
    collection: "csends",
    key: { container_id: 1, type: 1, status: 1, date: -1 },
    name: "csends_container_type_status_date",
  },
  {
    collection: "csends",
    key: { "payload.startRequestId": 1 },
    name: "csends_payload_startRequestId",
  },
  {
    collection: "csends",
    key: { type: 1, status: 1 },
    name: "csends_type_status",
  },
  {
    collection: "files",
    key: { sha256: 1 },
    name: "files_sha256",
  },
  {
    collection: "files",
    key: { userId: 1 },
    name: "files_userId",
  },
  {
    collection: "statsDaily",
    key: { "requestsByUser.userId": 1 },
    name: "statsDaily_requestsByUser_userId",
  },
];

function queryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function queryValues(value: string | string[] | undefined) {
  if (!value) return [];
  return Array.isArray(value) ? value : value.split(",");
}

function apiKeyFromRequest(req: NextApiRequest) {
  const header = req.headers["x-api-key"];
  return (
    (Array.isArray(header) ? header[0] : header) ||
    queryValue(req.query.API_KEY)
  );
}

function sameKey(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export default async function ensureIndexes(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Expected GET or POST" });
  }

  if (!process.env.API_KEY) {
    return res.status(500).json({ error: "API_KEY is not configured" });
  }

  if (apiKeyFromRequest(req) !== process.env.API_KEY) {
    return res.status(403).json({ error: "Forbidden" });
  }

  if (!gs.dba) {
    return res.status(500).json({ error: "Database not connected" });
  }

  const dryRun = ["1", "true", "yes"].includes(
    queryValue(req.query.dryRun)?.toLowerCase() || "",
  );
  const collectionFilters = queryValues(req.query.collection);
  const nameFilters = queryValues(req.query.name);
  const specs = managedIndexes.filter((index) => {
    if (
      collectionFilters.length &&
      !collectionFilters.includes(index.collection)
    ) {
      return false;
    }
    if (nameFilters.length && !nameFilters.includes(index.name)) {
      return false;
    }
    return true;
  });

  if (!specs.length) {
    return res.status(400).json({
      error: "No managed indexes matched the supplied filters",
      collections: Array.from(
        new Set(managedIndexes.map((index) => index.collection)),
      ).sort(),
      indexNames: managedIndexes.map((index) => index.name).sort(),
    });
  }

  const db = await gs.dba.dbPromise;
  const results: IndexResult[] = [];

  for (const spec of specs) {
    try {
      const collection = db.collection(spec.collection);
      const indexes = await collection.indexes();
      const existing = indexes.find((index) => index.name === spec.name);

      if (existing) {
        if (!sameKey(existing.key, spec.key)) {
          results.push({
            ...spec,
            status: "conflict",
            existing,
          });
        } else {
          results.push({ ...spec, status: "exists" });
        }
        continue;
      }

      const sameKeyExisting = indexes.find((index) =>
        sameKey(index.key, spec.key),
      );
      if (sameKeyExisting) {
        results.push({
          ...spec,
          status: "exists_with_different_name",
          existingName: sameKeyExisting.name,
        });
        continue;
      }

      if (dryRun) {
        results.push({ ...spec, status: "would_create" });
        continue;
      }

      await collection.createIndex(spec.key, { name: spec.name });
      results.push({ ...spec, status: "created" });
    } catch (error) {
      results.push({
        ...spec,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const summary = results.reduce<Record<IndexResult["status"], number>>(
    (acc, result) => {
      acc[result.status]++;
      return acc;
    },
    {
      conflict: 0,
      created: 0,
      error: 0,
      exists: 0,
      exists_with_different_name: 0,
      would_create: 0,
    },
  );
  const hasFailure = summary.conflict > 0 || summary.error > 0;

  return res.status(hasFailure ? 409 : 200).json({
    dryRun,
    summary,
    results,
  });
}
