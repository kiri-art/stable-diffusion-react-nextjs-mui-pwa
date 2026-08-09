import {
  type ClientSession,
  type Db,
  type Document,
  type MongoClient,
  ObjectId,
  type WithId,
} from "mongodb";
import { accountUsageDay } from "./accountUsage";

export type AccountDataAction =
  | "anonymized"
  | "deleted"
  | "failed"
  | "retained"
  | "skipped_shared"
  | "updated";

export interface AccountDataReportEntry {
  action: AccountDataAction;
  affectedRows: number;
  name: string;
  reason?: string;
}

export interface AccountDeletionReport {
  collections: AccountDataReportEntry[];
  deletionId?: string;
  resources: AccountDataReportEntry[];
  status: "complete" | "not_found" | "partial";
  targetUserId: string;
}

export interface ExternalDeletionResult {
  affectedRows: number;
  failed?: string[];
}

export interface AccountDataExternalServices {
  deleteS3Objects?: (keys: string[]) => Promise<ExternalDeletionResult>;
  deleteStripeCustomer?: (
    customerId: string,
  ) => Promise<ExternalDeletionResult>;
}

export interface PreviewAccountDeletionOptions {
  db: Db;
  targetUserId: ObjectId | string;
}

export interface DeleteAccountDataOptions
  extends PreviewAccountDeletionOptions {
  client: MongoClient;
  external?: AccountDataExternalServices;
}

export interface RetryAccountDeletionJobOptions {
  client: MongoClient;
  db: Db;
  deletionId: ObjectId | string;
  external?: AccountDataExternalServices;
}

export const ACCOUNT_DATA_EXPORT_COLLECTIONS = [
  "users",
  "accounts",
  "sessions",
  "orders",
  "userRequests",
  "stars",
  "likes",
  "reportedStars",
  "files",
  "statsDaily",
] as const;

export const ACCOUNT_DATA_REDACTED_VALUE = "[REDACTED]";

export type AccountDataExportCollectionName =
  (typeof ACCOUNT_DATA_EXPORT_COLLECTIONS)[number];

export interface AccountDataExportCollection {
  data: unknown;
  name: AccountDataExportCollectionName;
}

export interface AccountDataExport {
  collections: AccountDataExportCollection[];
  targetUserId: string;
}

export interface ExportAccountDataOptions
  extends PreviewAccountDeletionOptions {}

export interface ExportedInteractionData {
  given: unknown[];
  received: Array<{ count: number; starId: string }>;
}

interface CounterRepair {
  likes: number;
  reports: number;
  starId: unknown;
}

interface AccountFootprint {
  collectionEntries: AccountDataReportEntry[];
  counterRepairs: CounterRepair[];
  deletableEmailIdentifiers: string[];
  fileDocuments: WithId<Document>[];
  fileIdValues: unknown[];
  ownedStarIdValues: unknown[];
  resourceEntries: AccountDataReportEntry[];
  s3DeleteKeys: string[];
  s3SharedKeys: string[];
  sharedEmailIdentifiers: string[];
  sharedFileIdValues: unknown[];
  stars: WithId<Document>[];
  stripeCustomerId?: string;
  stripeCustomerShared: boolean;
  targetUser: WithId<Document>;
  userRequests: WithId<Document>[];
  userIdValues: unknown[];
}

interface DatabaseDeletionResult {
  collections: AccountDataReportEntry[];
  footprint: AccountFootprint;
}

interface AccountDeletionPhaseOneResult {
  deletionId: ObjectId;
  revokedSessions: number;
}

interface AccountDeletionJobDocument extends Document {
  _id: ObjectId;
  attempts: number;
  collectionReport?: AccountDataReportEntry[];
  createdAt: Date;
  databaseCompletedAt?: Date;
  pendingS3Keys?: string[];
  pendingStripeCustomerId?: string;
  phase: "database_pending" | "external_pending";
  resourceReport?: AccountDataReportEntry[];
  revokedSessions: number;
  targetUserId: ObjectId;
  updatedAt: Date;
}

const transactionOptions = {
  readConcern: { level: "snapshot" as const },
  writeConcern: { w: "majority" as const },
};

const ADMIN_DELETION_GUARD_ID = "admin-deletion";
const topologyPreflightByClient = new WeakMap<MongoClient, Promise<void>>();

/** Raised when safe transactional deletion is unavailable on this topology. */
export class AccountDeletionConfigurationError extends Error {
  constructor() {
    super("Account deletion requires a transactional MongoDB deployment");
    this.name = "AccountDeletionConfigurationError";
  }
}

/**
 * Raised from inside the deletion transaction when deleting the target would
 * leave the application without an administrator.
 */
export class LastAdminDeletionError extends Error {
  constructor() {
    super("The final administrator account cannot be deleted");
    this.name = "LastAdminDeletionError";
  }
}

export class AccountDeletionJobNotFoundError extends Error {
  constructor() {
    super("No pending account-deletion job exists with that ID");
    this.name = "AccountDeletionJobNotFoundError";
  }
}

/**
 * Cache the topology check by native client. A replica set or mongos is a hard
 * prerequisite; deletion must never fall back to non-transactional writes.
 */
export async function assertTransactionalDeletionTopology(
  client: MongoClient,
): Promise<void> {
  let preflight = topologyPreflightByClient.get(client);
  if (!preflight) {
    preflight = (async () => {
      const hello = await client.db("admin").command({ hello: 1 });
      if (typeof hello.setName !== "string" && hello.msg !== "isdbgrid") {
        throw new AccountDeletionConfigurationError();
      }
    })();
    topologyPreflightByClient.set(client, preflight);
  }

  try {
    await preflight;
  } catch (error) {
    // Cache successes, but allow a deployment that has just been promoted from
    // standalone to a replica set to recover without an application restart.
    topologyPreflightByClient.delete(client);
    throw error;
  }
}

function objectIdFrom(value: ObjectId | string): ObjectId {
  if (value instanceof ObjectId) return value;
  if (!ObjectId.isValid(value)) throw new TypeError("Invalid target user ID");
  return new ObjectId(value);
}

function deletionJobIdFrom(value: ObjectId | string): ObjectId {
  if (value instanceof ObjectId) return value;
  if (!ObjectId.isValid(value)) throw new TypeError("Invalid deletion job ID");
  return new ObjectId(value);
}

function idString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value instanceof ObjectId) return value.toHexString();
  if (
    value &&
    typeof value === "object" &&
    "toHexString" in value &&
    typeof value.toHexString === "function"
  ) {
    const result = value.toHexString();
    return typeof result === "string" ? result : null;
  }
  return null;
}

function idValues(value: unknown): unknown[] {
  const stringValue = idString(value);
  if (!stringValue) return [value];

  const values: unknown[] = [stringValue];
  if (ObjectId.isValid(stringValue)) values.unshift(new ObjectId(stringValue));
  return values;
}

function uniqueValues(values: unknown[]): unknown[] {
  const seen = new Set<string>();
  const result: unknown[] = [];

  for (const value of values) {
    const key = idString(value) || `${typeof value}:${String(value)}`;
    const typeKey = `${value instanceof ObjectId ? "objectId" : typeof value}:${key}`;
    if (seen.has(typeKey)) continue;
    seen.add(typeKey);
    result.push(value);
  }

  return result;
}

function allIdValues(values: unknown[]): unknown[] {
  return uniqueValues(values.flatMap((value) => idValues(value)));
}

function stringValues(values: unknown[]): string[] {
  return Array.from(
    new Set(
      values.filter(
        (value): value is string =>
          typeof value === "string" && value.length > 0,
      ),
    ),
  );
}

function userEmailIdentifiers(user: Document): string[] {
  const values: unknown[] = [user.email];
  if (Array.isArray(user.emails)) {
    for (const email of user.emails) {
      if (typeof email === "string") values.push(email);
      else if (email && typeof email === "object") {
        values.push((email as Record<string, unknown>).value);
      }
    }
  }

  return stringValues(values);
}

function normalizedEmail(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function exactEmailPatterns(emailIdentifiers: string[]): RegExp[] {
  return emailIdentifiers.map(
    (email) => new RegExp(`^${escapeRegex(email.trim())}$`, "i"),
  );
}

function emailReferenceFilter(emailIdentifiers: string[]): Document | null {
  if (!emailIdentifiers.length) return null;

  const exactEmails = exactEmailPatterns(emailIdentifiers);
  return {
    $or: [
      { identifier: { $in: exactEmails } },
      { email: { $in: exactEmails } },
    ],
  };
}

function deletableEmailReferenceFilter(
  deletableEmailIdentifiers: string[],
  sharedEmailIdentifiers: string[],
): Document | null {
  const deletable = emailReferenceFilter(deletableEmailIdentifiers);
  if (!deletable) return null;

  const shared = emailReferenceFilter(sharedEmailIdentifiers);
  if (!shared || !Array.isArray(shared.$or)) return deletable;

  // A malformed legacy token can contain both `identifier` and `email`.
  // When either field belongs to a surviving user, preservation wins.
  return { $and: [deletable, { $nor: shared.$or }] };
}

function reportEntry(
  name: string,
  action: AccountDataAction,
  affectedRows: number,
  reason?: string,
): AccountDataReportEntry {
  return { name, action, affectedRows, ...(reason ? { reason } : {}) };
}

// Several legacy collections contain a mix of string and ObjectId references.
// The native driver types `_id` as ObjectId by default, so keep the unavoidable
// mixed-ID cast in one place while preserving both representations at runtime.
function mixedIdFilter(filter: Document): never {
  return filter as never;
}

export function collectFileReferences(files: unknown): unknown[] {
  if (!files) return [];
  if (Array.isArray(files)) return files.flatMap(collectFileReferences);
  if (idString(files) !== null) return [files];
  if (typeof files !== "object") return [files];

  return Object.values(files as Record<string, unknown>).flatMap(
    collectFileReferences,
  );
}

function sameId(left: unknown, right: unknown): boolean {
  const leftString = idString(left);
  const rightString = idString(right);

  if (leftString !== null || rightString !== null) {
    return leftString !== null && leftString === rightString;
  }

  return Object.is(left, right);
}

function isSensitiveCredentialKey(key: string): boolean {
  const normalized = key.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
  const exactMatches = new Set([
    "authorization",
    "bearertoken",
    "cookie",
    "credentials",
    "idtoken",
    "oauthToken".toLowerCase(),
    "privatekey",
    "servicetoken",
    "sessionid",
    "sessiontoken",
    "token",
  ]);

  return (
    exactMatches.has(normalized) ||
    normalized.includes("password") ||
    normalized.endsWith("accesstoken") ||
    normalized.endsWith("refreshtoken") ||
    normalized.endsWith("apikey") ||
    normalized.endsWith("secret")
  );
}

function isSensitiveUrlParameter(key: string): boolean {
  const normalized = key.toLowerCase().replaceAll(/[^a-z0-9]/g, "");
  return (
    isSensitiveCredentialKey(key) ||
    normalized === "auth" ||
    normalized === "key" ||
    normalized === "sig" ||
    normalized.endsWith("credential") ||
    normalized.endsWith("signature") ||
    normalized.endsWith("token")
  );
}

function sanitizeCredentialedUrl(value: string): string {
  if (!/^https?:\/\//i.test(value)) return value;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return value;
  }

  let changed = false;
  if (url.username) {
    url.username = ACCOUNT_DATA_REDACTED_VALUE;
    changed = true;
  }
  if (url.password) {
    url.password = ACCOUNT_DATA_REDACTED_VALUE;
    changed = true;
  }
  for (const key of Array.from(url.searchParams.keys())) {
    if (!isSensitiveUrlParameter(key)) continue;
    url.searchParams.set(key, ACCOUNT_DATA_REDACTED_VALUE);
    changed = true;
  }
  if (url.hash.length > 1 && url.hash.includes("=")) {
    const hashParameters = new URLSearchParams(url.hash.slice(1));
    let hashChanged = false;
    for (const key of Array.from(hashParameters.keys())) {
      if (!isSensitiveUrlParameter(key)) continue;
      hashParameters.set(key, ACCOUNT_DATA_REDACTED_VALUE);
      hashChanged = true;
    }
    if (hashChanged) {
      url.hash = hashParameters.toString();
      changed = true;
    }
  }

  return changed ? url.toString() : value;
}

function isPlainObject(value: object): value is Record<string, unknown> {
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

/**
 * Return a JSON-safe view of account data without replayable credentials.
 * BSON scalar values are left intact so their normal JSON representations are
 * preserved by the ZIP serializer.
 */
export function sanitizeAccountDataValue(value: unknown): unknown {
  if (typeof value === "string") return sanitizeCredentialedUrl(value);
  if (Array.isArray(value)) return value.map(sanitizeAccountDataValue);
  if (!value || typeof value !== "object" || !isPlainObject(value))
    return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      isSensitiveCredentialKey(key)
        ? ACCOUNT_DATA_REDACTED_VALUE
        : sanitizeAccountDataValue(nestedValue),
    ]),
  );
}

/** Export useful login metadata without session IDs or replay credentials. */
export function selectExportSessions(
  documents: readonly Document[],
): unknown[] {
  return documents.map((document) => {
    const selected: Record<string, unknown> = {};
    for (const key of ["expires", "ip", "userAgent"] as const) {
      if (document[key] !== undefined) {
        selected[key] = sanitizeAccountDataValue(document[key]);
      }
    }
    return selected;
  });
}

/**
 * Whitelist the account-side daily ledger. This also keeps pre-migration ZIPs
 * from exposing legacy request IDs or exact timestamps.
 */
export function selectExportAccountUsage(
  documents: readonly Document[],
): unknown[] {
  return documents.map((document) => {
    const selected: Record<string, unknown> = {};
    for (const key of [
      "credits",
      "freeCredits",
      "paid",
      "paidCredits",
      "requests",
      "schemaVersion",
      "userId",
    ] as const) {
      if (document[key] !== undefined) selected[key] = document[key];
    }
    if (document.date !== undefined) {
      const date =
        document.date instanceof Date
          ? document.date
          : new Date(document.date as string | number);
      if (!Number.isNaN(date.getTime())) selected.date = accountUsageDay(date);
    }
    return sanitizeAccountDataValue(selected);
  });
}

/**
 * Keep a user's own interaction records while exposing interactions received
 * by their stars only as anonymous per-star counts.
 */
export function selectExportInteractions({
  documents,
  includeInactiveLikes = false,
  ownedStarIds,
  targetUserId,
}: {
  documents: readonly Document[];
  includeInactiveLikes?: boolean;
  ownedStarIds: readonly unknown[];
  targetUserId: ObjectId | string;
}): ExportedInteractionData {
  const ownedStars = new Set(
    ownedStarIds
      .map(idString)
      .filter((value): value is string => value !== null),
  );
  const received = new Map<string, number>();
  const given: unknown[] = [];

  for (const document of documents) {
    if (sameId(document.userId, targetUserId)) {
      given.push(sanitizeAccountDataValue(document));
      continue;
    }

    const starId = idString(document.starId);
    if (!starId || !ownedStars.has(starId)) continue;
    if (!includeInactiveLikes && document.liked === false) continue;

    received.set(starId, (received.get(starId) || 0) + 1);
  }

  return {
    given,
    received: Array.from(received, ([starId, count]) => ({
      count,
      starId,
    })).sort((left, right) => left.starId.localeCompare(right.starId)),
  };
}

/** Select only the requesting user's nested daily-stat entries. */
export function selectExportStatsDaily(
  documents: readonly Document[],
  targetUserId: ObjectId | string,
): unknown[] {
  return documents.flatMap((document) => {
    if (!Array.isArray(document.requestsByUser)) return [];

    const requestsByUser = document.requestsByUser.filter(
      (entry): entry is Record<string, unknown> =>
        Boolean(
          entry &&
            typeof entry === "object" &&
            sameId((entry as Record<string, unknown>).userId, targetUserId),
        ),
    );
    if (!requestsByUser.length) return [];

    return [
      sanitizeAccountDataValue({
        _id: document._id,
        date: document.date,
        requestsByUser,
      }),
    ];
  });
}

function hasForeignFileOwner(
  document: Document,
  targetUserId: ObjectId | string,
): boolean {
  return (
    document.userId !== undefined &&
    document.userId !== null &&
    !sameId(document.userId, targetUserId)
  );
}

/**
 * Export metadata for files referenced by the user's stars, but never disclose
 * the owner identifier when the underlying file row belongs to another user.
 */
export function selectExportFiles(
  documents: readonly Document[],
  targetUserId: ObjectId | string,
): unknown[] {
  return documents.map((document) => {
    if (!hasForeignFileOwner(document, targetUserId)) {
      return sanitizeAccountDataValue(document);
    }

    const { userId: _foreignUserId, ...metadata } = document;
    return sanitizeAccountDataValue(metadata);
  });
}

function starCounterRepairMap(
  ownedStarIds: Set<string>,
  likes: WithId<Document>[],
  reports: WithId<Document>[],
): Map<string, CounterRepair> {
  const repairs = new Map<string, CounterRepair>();

  const add = (starId: unknown, field: "likes" | "reports") => {
    const key = idString(starId);
    if (!key || ownedStarIds.has(key)) return;

    const repair = repairs.get(key) || { likes: 0, reports: 0, starId };
    repair[field]++;
    repairs.set(key, repair);
  };

  for (const like of likes) if (like.liked !== false) add(like.starId, "likes");
  for (const report of reports) add(report.starId, "reports");

  return repairs;
}

async function discoverAccountFootprint(
  db: Db,
  targetUserId: ObjectId,
  session?: ClientSession,
): Promise<AccountFootprint | null> {
  const userIdValues = allIdValues([targetUserId]);
  const targetUser = await db
    .collection("users")
    .findOne(mixedIdFilter({ _id: { $in: userIdValues } }), { session });
  if (!targetUser) return null;

  const stars = await db
    .collection("stars")
    .find({ userId: { $in: userIdValues } }, { session })
    .toArray();
  const ownedStarIds = stars.map((star) => star._id);
  const ownedStarIdValues = allIdValues(ownedStarIds);
  const ownedStarIdStrings = new Set(
    ownedStarIds
      .map(idString)
      .filter((value): value is string => Boolean(value)),
  );

  const userRequests = await db
    .collection("userRequests")
    .find({ userId: { $in: userIdValues } }, { session })
    .toArray();

  const starFileIds = stars.flatMap((star) =>
    collectFileReferences(star.files),
  );
  const starFileIdValues = allIdValues(starFileIds);
  const fileQueryParts: Document[] = [{ userId: { $in: userIdValues } }];
  if (starFileIdValues.length) {
    fileQueryParts.push({ _id: { $in: starFileIdValues } });
  }
  const fileDocuments = await db
    .collection("files")
    .find({ $or: fileQueryParts }, { session })
    .toArray();
  const allFileIds = new Set(
    fileDocuments
      .map((file) => idString(file._id))
      .filter((value): value is string => value !== null),
  );
  // TODO: Normalize reverse references (for example, indexed `fileRefs`) before
  // optimizing this scan. Legacy stars used nested, non-uniform `files` shapes,
  // so current-path-only queries can miss a surviving reference and cause
  // irreversible shared-file deletion.
  const survivingStarsWithFiles = fileDocuments.length
    ? await db
        .collection("stars")
        .find(
          mixedIdFilter({
            _id: { $nin: ownedStarIdValues },
            files: { $exists: true },
          }),
          { session, projection: { files: 1 } },
        )
        .toArray()
    : [];
  const sharedFileIds = new Set(
    survivingStarsWithFiles
      .flatMap((star) => collectFileReferences(star.files))
      .map(idString)
      .filter(
        (value): value is string => value !== null && allFileIds.has(value),
      ),
  );
  for (const file of fileDocuments) {
    const fileId = idString(file._id);
    if (fileId && hasForeignFileOwner(file, targetUserId)) {
      sharedFileIds.add(fileId);
    }
  }
  const sharedFileDocuments = fileDocuments.filter((file) => {
    const fileId = idString(file._id);
    return fileId !== null && sharedFileIds.has(fileId);
  });
  const deletableFileDocuments = fileDocuments.filter((file) => {
    const fileId = idString(file._id);
    return fileId === null || !sharedFileIds.has(fileId);
  });
  const fileIdValues = allIdValues(
    deletableFileDocuments.map((file) => file._id),
  );
  const sharedFileIdValues = allIdValues(
    sharedFileDocuments.map((file) => file._id),
  );
  const sharedOwnedFileCount = sharedFileDocuments.filter((file) =>
    userIdValues.some((userId) => sameId(file.userId, userId)),
  ).length;

  const targetLikes = await db
    .collection("likes")
    .find({ userId: { $in: userIdValues } }, { session })
    .toArray();
  const targetReports = await db
    .collection("reportedStars")
    .find({ userId: { $in: userIdValues } }, { session })
    .toArray();
  const repairMap = starCounterRepairMap(
    ownedStarIdStrings,
    targetLikes,
    targetReports,
  );
  const possibleRepairs = Array.from(repairMap.values());
  const repairStarIdValues = allIdValues(
    possibleRepairs.map((repair) => repair.starId),
  );
  const survivingRepairStars = repairStarIdValues.length
    ? await db
        .collection("stars")
        .find(mixedIdFilter({ _id: { $in: repairStarIdValues } }), {
          session,
          projection: { _id: 1 },
        })
        .toArray()
    : [];
  const survivingRepairIds = new Set(
    survivingRepairStars
      .map((star) => idString(star._id))
      .filter((value): value is string => Boolean(value)),
  );
  const counterRepairs = possibleRepairs.filter((repair) => {
    const key = idString(repair.starId);
    return Boolean(key && survivingRepairIds.has(key));
  });

  const directOrOwnedStarQuery: Document[] = [
    { userId: { $in: userIdValues } },
  ];
  if (ownedStarIdValues.length) {
    directOrOwnedStarQuery.push({ starId: { $in: ownedStarIdValues } });
  }

  // This helper also runs inside the deletion transaction. MongoDB does not
  // support parallel operations using the same transaction session.
  const accountCount = await db
    .collection("accounts")
    .countDocuments({ userId: { $in: userIdValues } }, { session });
  const likeCount = await db
    .collection("likes")
    .countDocuments({ $or: directOrOwnedStarQuery }, { session });
  const orderCount = await db
    .collection("orders")
    .countDocuments({ userId: { $in: userIdValues } }, { session });
  const reportedStarCount = await db
    .collection("reportedStars")
    .countDocuments({ $or: directOrOwnedStarQuery }, { session });
  const sessionCount = await db
    .collection("sessions")
    .countDocuments({ userId: { $in: userIdValues } }, { session });
  const targetEmailIdentifiers = userEmailIdentifiers(targetUser);
  const targetEmailPatterns = exactEmailPatterns(targetEmailIdentifiers);
  const survivingUsersWithTargetEmail = targetEmailPatterns.length
    ? await db
        .collection("users")
        .find(
          mixedIdFilter({
            _id: { $nin: userIdValues },
            $or: [
              { email: { $in: targetEmailPatterns } },
              { "emails.value": { $in: targetEmailPatterns } },
            ],
          }),
          { session, projection: { email: 1, "emails.value": 1 } },
        )
        .toArray()
    : [];
  const sharedNormalizedEmails = new Set(
    survivingUsersWithTargetEmail
      .flatMap(userEmailIdentifiers)
      .map(normalizedEmail),
  );
  const sharedEmailIdentifiers = targetEmailIdentifiers.filter((email) =>
    sharedNormalizedEmails.has(normalizedEmail(email)),
  );
  const deletableEmailIdentifiers = targetEmailIdentifiers.filter(
    (email) => !sharedNormalizedEmails.has(normalizedEmail(email)),
  );
  const deletableVerificationTokenFilter = deletableEmailReferenceFilter(
    deletableEmailIdentifiers,
    sharedEmailIdentifiers,
  );
  const sharedVerificationTokenFilter = emailReferenceFilter(
    sharedEmailIdentifiers,
  );
  const verificationTokenCount = deletableVerificationTokenFilter
    ? await db
        .collection("verification_tokens")
        .countDocuments(deletableVerificationTokenFilter, { session })
    : 0;
  const sharedVerificationTokenCount = sharedVerificationTokenFilter
    ? await db
        .collection("verification_tokens")
        .countDocuments(sharedVerificationTokenFilter, { session })
    : 0;
  const statsDailyCount = await db
    .collection("statsDaily")
    .countDocuments(
      { "requestsByUser.userId": { $in: userIdValues } },
      { session },
    );

  const candidateShas = stringValues(
    fileDocuments.map((file) => file.sha256).filter(Boolean),
  );
  const survivingFiles = candidateShas.length
    ? await db
        .collection("files")
        .find(
          mixedIdFilter({
            _id: { $nin: fileIdValues },
            sha256: { $in: candidateShas },
          }),
          { session, projection: { sha256: 1 } },
        )
        .toArray()
    : [];
  const sharedShas = new Set(
    survivingFiles
      .map((file) => file.sha256)
      .filter((value): value is string => typeof value === "string"),
  );
  const s3SharedKeys = candidateShas.filter((sha) => sharedShas.has(sha));
  const s3DeleteKeys = candidateShas.filter((sha) => !sharedShas.has(sha));

  const collectionEntries = [
    reportEntry("accounts", "deleted", accountCount),
    reportEntry("files", "deleted", deletableFileDocuments.length),
    reportEntry(
      "files",
      "skipped_shared",
      sharedFileDocuments.length,
      sharedFileDocuments.length
        ? "Retained because another user owns the file or a surviving star references it"
        : undefined,
    ),
    reportEntry("files", "updated", sharedOwnedFileCount),
    reportEntry("likes", "deleted", likeCount),
    reportEntry("orders", "anonymized", orderCount),
    reportEntry("reportedStars", "deleted", reportedStarCount),
    reportEntry("sessions", "deleted", sessionCount),
    reportEntry("stars", "deleted", stars.length),
    reportEntry("stars", "updated", counterRepairs.length),
    reportEntry("statsDaily", "updated", statsDailyCount),
    reportEntry("userRequests", "deleted", userRequests.length),
    reportEntry("users", "deleted", 1),
    reportEntry("verification_tokens", "deleted", verificationTokenCount),
    reportEntry(
      "verification_tokens",
      "skipped_shared",
      sharedVerificationTokenCount,
      sharedVerificationTokenCount
        ? "Retained because a surviving user has the same email address"
        : undefined,
    ),
  ];
  const stripeCustomerId =
    typeof targetUser.stripeCustomerId === "string" &&
    targetUser.stripeCustomerId.length > 0
      ? targetUser.stripeCustomerId
      : undefined;
  const stripeCustomerShared = stripeCustomerId
    ? Boolean(
        await db.collection("users").findOne(
          mixedIdFilter({
            _id: { $nin: userIdValues },
            stripeCustomerId,
          }),
          { session, projection: { _id: 1 } },
        ),
      )
    : false;
  const resourceEntries = [
    reportEntry("s3", "deleted", s3DeleteKeys.length),
    reportEntry(
      "s3",
      "skipped_shared",
      s3SharedKeys.length,
      s3SharedKeys.length
        ? "Retained because a surviving file record uses the same content hash"
        : undefined,
    ),
    reportEntry(
      "stripe",
      "deleted",
      stripeCustomerId && !stripeCustomerShared ? 1 : 0,
    ),
    reportEntry(
      "stripe",
      "skipped_shared",
      stripeCustomerShared ? 1 : 0,
      stripeCustomerShared
        ? "Retained because a surviving user references the same Stripe customer"
        : undefined,
    ),
  ];

  return {
    collectionEntries,
    counterRepairs,
    deletableEmailIdentifiers,
    fileDocuments,
    fileIdValues,
    ownedStarIdValues,
    resourceEntries,
    s3DeleteKeys,
    s3SharedKeys,
    sharedEmailIdentifiers,
    sharedFileIdValues,
    stars,
    stripeCustomerId,
    stripeCustomerShared,
    targetUser,
    userRequests,
    userIdValues,
  };
}

function notFoundReport(targetUserId: ObjectId): AccountDeletionReport {
  return {
    collections: [],
    resources: [],
    status: "not_found",
    targetUserId: targetUserId.toHexString(),
  };
}

export async function previewAccountDeletion({
  db,
  targetUserId: rawTargetUserId,
}: PreviewAccountDeletionOptions): Promise<AccountDeletionReport> {
  const targetUserId = objectIdFrom(rawTargetUserId);
  const footprint = await discoverAccountFootprint(db, targetUserId);
  if (!footprint) return notFoundReport(targetUserId);

  return {
    collections: footprint.collectionEntries,
    resources: footprint.resourceEntries,
    status: "complete",
    targetUserId: targetUserId.toHexString(),
  };
}

/** Build the explicit, credential-free JSON payloads used by the ZIP export. */
export async function exportAccountData({
  db,
  targetUserId: rawTargetUserId,
}: ExportAccountDataOptions): Promise<AccountDataExport | null> {
  const targetUserId = objectIdFrom(rawTargetUserId);
  const footprint = await discoverAccountFootprint(db, targetUserId);
  if (!footprint) return null;

  const {
    fileDocuments,
    ownedStarIdValues,
    stars,
    targetUser,
    userIdValues,
    userRequests,
  } = footprint;
  const directOrOwnedStarQuery: Document[] = [
    { userId: { $in: userIdValues } },
  ];
  if (ownedStarIdValues.length) {
    directOrOwnedStarQuery.push({ starId: { $in: ownedStarIdValues } });
  }
  const accounts = await db
    .collection("accounts")
    .find({ userId: { $in: userIdValues } })
    .toArray();
  const sessions = await db
    .collection("sessions")
    .find({ userId: { $in: userIdValues } })
    .toArray();
  const orders = await db
    .collection("orders")
    .find({ userId: { $in: userIdValues } })
    .toArray();
  const likes = await db
    .collection("likes")
    .find({ $or: directOrOwnedStarQuery })
    .toArray();
  const reportedStars = await db
    .collection("reportedStars")
    .find({ $or: directOrOwnedStarQuery })
    .toArray();
  const statsDaily = await db
    .collection("statsDaily")
    .find({ "requestsByUser.userId": { $in: userIdValues } })
    .toArray();

  const sanitizedDocuments = (documents: readonly Document[]) =>
    documents.map(sanitizeAccountDataValue);
  const collectionData: Record<AccountDataExportCollectionName, unknown> = {
    users: [sanitizeAccountDataValue(targetUser)],
    accounts: sanitizedDocuments(accounts),
    sessions: selectExportSessions(sessions),
    orders: sanitizedDocuments(orders),
    userRequests: selectExportAccountUsage(userRequests),
    stars: sanitizedDocuments(stars),
    likes: selectExportInteractions({
      documents: likes,
      ownedStarIds: ownedStarIdValues,
      targetUserId,
    }),
    reportedStars: selectExportInteractions({
      documents: reportedStars,
      includeInactiveLikes: true,
      ownedStarIds: ownedStarIdValues,
      targetUserId,
    }),
    files: selectExportFiles(fileDocuments, targetUserId),
    statsDaily: selectExportStatsDaily(statsDaily, targetUserId),
  };

  return {
    collections: ACCOUNT_DATA_EXPORT_COLLECTIONS.map((name) => ({
      data: collectionData[name],
      name,
    })),
    targetUserId: targetUserId.toHexString(),
  };
}

async function repairSurvivingStarCounters(
  db: Db,
  repairs: CounterRepair[],
  session: ClientSession,
): Promise<number> {
  let affectedRows = 0;

  for (const repair of repairs) {
    const set: Document = {};
    if (repair.likes) {
      set.likes = {
        $max: [0, { $subtract: [{ $ifNull: ["$likes", 0] }, repair.likes] }],
      };
    }
    if (repair.reports) {
      set.reports = {
        $max: [
          0,
          { $subtract: [{ $ifNull: ["$reports", 0] }, repair.reports] },
        ],
      };
    }

    const result = await db
      .collection("stars")
      .updateOne(
        mixedIdFilter({ _id: { $in: idValues(repair.starId) } }),
        [{ $set: set }],
        { session },
      );
    affectedRows += result.modifiedCount;
  }

  return affectedRows;
}

function replaceEntryCount(
  entries: AccountDataReportEntry[],
  name: string,
  action: AccountDataAction,
  affectedRows: number,
): void {
  const entry = entries.find(
    (candidate) => candidate.name === name && candidate.action === action,
  );
  if (entry) entry.affectedRows = affectedRows;
  else entries.push(reportEntry(name, action, affectedRows));
}

function isDuplicateKeyError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11_000,
  );
}

async function ensureAdminDeletionGuard(db: Db): Promise<void> {
  try {
    await db
      .collection("accountDataGuards")
      .updateOne(
        mixedIdFilter({ _id: ADMIN_DELETION_GUARD_ID }),
        { $setOnInsert: { version: 0 } },
        { upsert: true },
      );
  } catch (error) {
    // Two first-time requests may race to create the same fixed, non-PII row.
    // Once either succeeds, both can safely use it for transactional locking.
    if (!isDuplicateKeyError(error)) throw error;
  }
}

async function assertAdminDeletionAllowed(
  db: Db,
  targetUserId: ObjectId,
  session: ClientSession,
): Promise<boolean> {
  const userIdValues = allIdValues([targetUserId]);
  const target = await db
    .collection("users")
    .findOne(mixedIdFilter({ _id: { $in: userIdValues } }), {
      session,
      projection: { admin: 1 },
    });
  if (!target) return false;
  if (target.admin !== true) return true;

  // Every administrator deletion writes the same row. Concurrent transactions
  // therefore conflict and MongoDB retries the loser against a fresh snapshot
  // before the administrator count is checked again.
  await db
    .collection("accountDataGuards")
    .updateOne(
      mixedIdFilter({ _id: ADMIN_DELETION_GUARD_ID }),
      { $inc: { version: 1 } },
      { session, upsert: true },
    );
  const adminCount = await db
    .collection("users")
    .countDocuments(
      { admin: true, deletionPendingAt: { $exists: false } },
      { session },
    );
  if (adminCount <= 1) throw new LastAdminDeletionError();

  return true;
}

async function beginAccountDeletion(
  db: Db,
  targetUserId: ObjectId,
  session: ClientSession,
): Promise<AccountDeletionPhaseOneResult | null> {
  const target = await db
    .collection("users")
    .findOne(mixedIdFilter({ _id: { $in: allIdValues([targetUserId]) } }), {
      projection: {
        deletionId: 1,
        deletionPendingAt: 1,
      },
      session,
    });
  if (!target) return null;

  if (target.deletionPendingAt && target.deletionId) {
    const deletionId = deletionJobIdFrom(target.deletionId);
    const job = await db
      .collection<AccountDeletionJobDocument>("accountDeletionJobs")
      .findOne({ _id: deletionId }, { session });
    if (!job) throw new AccountDeletionJobNotFoundError();
    return {
      deletionId,
      revokedSessions: job.revokedSessions || 0,
    };
  }

  if (!(await assertAdminDeletionAllowed(db, targetUserId, session))) {
    return null;
  }

  const now = new Date();
  const deletionId = new ObjectId();
  await db
    .collection<AccountDeletionJobDocument>("accountDeletionJobs")
    .insertOne(
      {
        _id: deletionId,
        attempts: 0,
        createdAt: now,
        phase: "database_pending",
        revokedSessions: 0,
        targetUserId,
        updatedAt: now,
      },
      { session },
    );

  const marked = await db.collection("users").updateOne(
    mixedIdFilter({
      _id: { $in: allIdValues([targetUserId]) },
      deletionPendingAt: { $exists: false },
    }),
    { $set: { deletionId, deletionPendingAt: now } },
    { session },
  );
  if (!marked.matchedCount) {
    throw new Error("Account deletion phase-one write lost its target");
  }

  const revoked = await db
    .collection("sessions")
    .deleteMany({ userId: { $in: allIdValues([targetUserId]) } }, { session });
  await db
    .collection<AccountDeletionJobDocument>("accountDeletionJobs")
    .updateOne(
      { _id: deletionId },
      {
        $set: {
          revokedSessions: revoked.deletedCount,
          updatedAt: now,
        },
      },
      { session },
    );

  return {
    deletionId,
    revokedSessions: revoked.deletedCount,
  };
}

async function deleteDatabaseData(
  db: Db,
  targetUserId: ObjectId,
  revokedSessions: number,
  session: ClientSession,
): Promise<DatabaseDeletionResult | null> {
  const footprint = await discoverAccountFootprint(db, targetUserId, session);
  if (!footprint) return null;

  const entries = footprint.collectionEntries.map((entry) => ({ ...entry }));
  const {
    deletableEmailIdentifiers,
    fileIdValues,
    ownedStarIdValues,
    sharedEmailIdentifiers,
    sharedFileIdValues,
    userIdValues,
  } = footprint;

  const updatedStars = await repairSurvivingStarCounters(
    db,
    footprint.counterRepairs,
    session,
  );
  replaceEntryCount(entries, "stars", "updated", updatedStars);

  const directOrOwnedStarQuery: Document[] = [
    { userId: { $in: userIdValues } },
  ];
  if (ownedStarIdValues.length) {
    directOrOwnedStarQuery.push({ starId: { $in: ownedStarIdValues } });
  }

  const likes = await db
    .collection("likes")
    .deleteMany({ $or: directOrOwnedStarQuery }, { session });
  replaceEntryCount(entries, "likes", "deleted", likes.deletedCount);

  const reports = await db
    .collection("reportedStars")
    .deleteMany({ $or: directOrOwnedStarQuery }, { session });
  replaceEntryCount(entries, "reportedStars", "deleted", reports.deletedCount);

  const files = fileIdValues.length
    ? await db
        .collection("files")
        .deleteMany(mixedIdFilter({ _id: { $in: fileIdValues } }), { session })
    : { deletedCount: 0 };
  replaceEntryCount(entries, "files", "deleted", files.deletedCount);

  const sharedFiles = sharedFileIdValues.length
    ? await db.collection("files").updateMany(
        mixedIdFilter({
          _id: { $in: sharedFileIdValues },
          userId: { $in: userIdValues },
        }),
        {
          $set: { accountDeletedAt: new Date() },
          $unset: { userId: "" },
        },
        { session },
      )
    : { modifiedCount: 0 };
  replaceEntryCount(entries, "files", "updated", sharedFiles.modifiedCount);

  const stars = ownedStarIdValues.length
    ? await db
        .collection("stars")
        .deleteMany(mixedIdFilter({ _id: { $in: ownedStarIdValues } }), {
          session,
        })
    : { deletedCount: 0 };
  replaceEntryCount(entries, "stars", "deleted", stars.deletedCount);

  const userRequests = await db
    .collection("userRequests")
    .deleteMany({ userId: { $in: userIdValues } }, { session });
  replaceEntryCount(
    entries,
    "userRequests",
    "deleted",
    userRequests.deletedCount,
  );

  const statsDaily = await db.collection("statsDaily").updateMany(
    { "requestsByUser.userId": { $in: userIdValues } },
    mixedIdFilter({
      $pull: { requestsByUser: { userId: { $in: userIdValues } } },
      $set: { __updatedAt: Date.now() },
    }),
    { session },
  );
  replaceEntryCount(entries, "statsDaily", "updated", statsDaily.modifiedCount);

  const orders = await db.collection("orders").updateMany(
    { userId: { $in: userIdValues } },
    {
      $set: { accountDeletedAt: new Date() },
      $unset: { userId: "" },
    },
    { session },
  );
  replaceEntryCount(entries, "orders", "anonymized", orders.modifiedCount);

  const accounts = await db
    .collection("accounts")
    .deleteMany({ userId: { $in: userIdValues } }, { session });
  replaceEntryCount(entries, "accounts", "deleted", accounts.deletedCount);

  const sessions = await db
    .collection("sessions")
    .deleteMany({ userId: { $in: userIdValues } }, { session });
  replaceEntryCount(
    entries,
    "sessions",
    "deleted",
    revokedSessions + sessions.deletedCount,
  );

  const deletableVerificationTokenFilter = deletableEmailReferenceFilter(
    deletableEmailIdentifiers,
    sharedEmailIdentifiers,
  );
  const verificationTokens = deletableVerificationTokenFilter
    ? await db
        .collection("verification_tokens")
        .deleteMany(deletableVerificationTokenFilter, { session })
    : { deletedCount: 0 };
  replaceEntryCount(
    entries,
    "verification_tokens",
    "deleted",
    verificationTokens.deletedCount,
  );

  const users = await db
    .collection("users")
    .deleteOne(mixedIdFilter({ _id: { $in: userIdValues } }), { session });
  replaceEntryCount(entries, "users", "deleted", users.deletedCount);

  return { collections: entries, footprint };
}

export interface S3DeletionRecheck {
  deleteKeys: string[];
  sharedKeys: string[];
}

/** Re-read surviving file rows after the deletion transaction commits. */
export async function recheckS3DeletionKeys(
  db: Db,
  candidateKeys: string[],
): Promise<S3DeletionRecheck> {
  const uniqueKeys = Array.from(new Set(candidateKeys));
  if (!uniqueKeys.length) return { deleteKeys: [], sharedKeys: [] };

  const survivingFiles = await db
    .collection("files")
    .find(
      { sha256: { $in: uniqueKeys } },
      { projection: { _id: 0, sha256: 1 } },
    )
    .toArray();
  const shared = new Set(
    survivingFiles
      .map((file) => file.sha256)
      .filter((value): value is string => typeof value === "string"),
  );

  return {
    deleteKeys: uniqueKeys.filter((key) => !shared.has(key)),
    sharedKeys: uniqueKeys.filter((key) => shared.has(key)),
  };
}

function mergedReportEntries(
  entries: AccountDataReportEntry[],
): AccountDataReportEntry[] {
  const merged = new Map<string, AccountDataReportEntry>();
  for (const entry of entries) {
    const key = `${entry.name}:${entry.action}`;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { ...entry });
      continue;
    }
    existing.affectedRows += entry.affectedRows;
    existing.reason ||= entry.reason;
  }
  return Array.from(merged.values());
}

async function removePendingS3Keys(
  db: Db,
  deletionId: ObjectId,
  keys: string[],
): Promise<void> {
  if (!keys.length) return;
  await db
    .collection<AccountDeletionJobDocument>("accountDeletionJobs")
    .updateOne(
      { _id: deletionId },
      {
        $pullAll: { pendingS3Keys: keys },
        $set: { updatedAt: new Date() },
      },
    );
}

async function removePendingStripeCustomer(
  db: Db,
  deletionId: ObjectId,
  customerId: string,
): Promise<void> {
  await db
    .collection<AccountDeletionJobDocument>("accountDeletionJobs")
    .updateOne(
      { _id: deletionId, pendingStripeCustomerId: customerId },
      {
        $set: { updatedAt: new Date() },
        $unset: { pendingStripeCustomerId: "" },
      },
    );
}

interface DatabasePhaseFinalization {
  activeWrites?: number;
  databaseResult?: DatabaseDeletionResult;
}

async function finalizeDatabaseDeletionPhase(
  client: MongoClient,
  db: Db,
  deletionId: ObjectId,
): Promise<DatabasePhaseFinalization | null> {
  return client.withSession((session) =>
    session.withTransaction(async () => {
      const jobs = db.collection<AccountDeletionJobDocument>(
        "accountDeletionJobs",
      );
      const job = await jobs.findOne({ _id: deletionId }, { session });
      if (!job) return null;
      if (job.phase !== "database_pending") return {};

      const now = new Date();
      const targetFilter = mixedIdFilter({
        _id: { $in: allIdValues([job.targetUserId]) },
        deletionId: { $in: allIdValues([deletionId]) },
        deletionPendingAt: { $exists: true },
      });
      await db.collection("users").updateOne(
        targetFilter,
        {
          $pull: {
            accountWriteLeases: {
              expiresAt: { $lte: now },
            },
          },
        },
        { session },
      );
      const target = await db.collection("users").findOne(targetFilter, {
        projection: { accountWriteLeases: 1 },
        session,
      });
      if (!target) {
        throw new Error("Pending account-deletion target is missing");
      }

      const activeWrites = Array.isArray(target.accountWriteLeases)
        ? target.accountWriteLeases.length
        : 0;
      if (activeWrites) return { activeWrites };

      const databaseResult = await deleteDatabaseData(
        db,
        job.targetUserId,
        job.revokedSessions || 0,
        session,
      );
      if (!databaseResult) {
        throw new Error("Pending account-deletion graph is missing its user");
      }

      const pendingS3Keys = Array.from(
        new Set(databaseResult.footprint.s3DeleteKeys),
      );
      const pendingStripeCustomerId = databaseResult.footprint
        .stripeCustomerShared
        ? undefined
        : databaseResult.footprint.stripeCustomerId;
      const resourceReport = databaseResult.footprint.resourceEntries.filter(
        (entry) => entry.action === "skipped_shared",
      );
      await jobs.updateOne(
        { _id: deletionId, phase: "database_pending" },
        {
          $set: {
            collectionReport: databaseResult.collections,
            databaseCompletedAt: now,
            phase: "external_pending",
            resourceReport,
            updatedAt: now,
            ...(pendingS3Keys.length ? { pendingS3Keys } : {}),
            ...(pendingStripeCustomerId ? { pendingStripeCustomerId } : {}),
          },
        },
        { session },
      );

      return { databaseResult };
    }, transactionOptions),
  );
}

/**
 * Resume a durable two-phase deletion job. Database finalization waits for
 * writers that crossed the phase-one boundary; external deletes are
 * idempotent, so a crash after the SDK call is safe to retry.
 */
export async function retryAccountDeletionJob({
  client,
  db,
  deletionId: rawDeletionId,
  external,
}: RetryAccountDeletionJobOptions): Promise<AccountDeletionReport> {
  const deletionId = deletionJobIdFrom(rawDeletionId);
  const jobs = db.collection<AccountDeletionJobDocument>("accountDeletionJobs");
  const job = await jobs.findOneAndUpdate(
    { _id: deletionId },
    { $inc: { attempts: 1 }, $set: { updatedAt: new Date() } },
    { includeResultMetadata: false, returnDocument: "after" },
  );
  if (!job) throw new AccountDeletionJobNotFoundError();

  let databaseCollections = job.collectionReport || [];
  let persistedResourceEntries = job.resourceReport || [];
  if (job.phase === "database_pending") {
    const finalization = await finalizeDatabaseDeletionPhase(
      client,
      db,
      deletionId,
    );
    if (!finalization) throw new AccountDeletionJobNotFoundError();
    if (finalization.activeWrites) {
      return {
        collections: job.revokedSessions
          ? [
              reportEntry(
                "sessions",
                "deleted",
                job.revokedSessions,
                "Revoked when account deletion entered its pending phase",
              ),
            ]
          : [],
        deletionId: deletionId.toHexString(),
        resources: [
          reportEntry(
            "account_writes",
            "retained",
            finalization.activeWrites,
            "Waiting for in-flight account operations before the final sweep",
          ),
        ],
        status: "partial",
        targetUserId: job.targetUserId.toHexString(),
      };
    }

    const finalizedJob = await jobs.findOne({ _id: deletionId });
    if (!finalizedJob) throw new AccountDeletionJobNotFoundError();
    databaseCollections = finalizedJob.collectionReport || [];
    persistedResourceEntries = finalizedJob.resourceReport || [];
  }

  const entries: AccountDataReportEntry[] = [];
  const externalJob = await jobs.findOne({ _id: deletionId });
  if (!externalJob) throw new AccountDeletionJobNotFoundError();
  const pendingS3Keys = Array.from(new Set(externalJob.pendingS3Keys || []));
  let s3Deleted = 0;
  let s3SkippedShared = 0;
  if (pendingS3Keys.length) {
    try {
      const rechecked = await recheckS3DeletionKeys(db, pendingS3Keys);
      s3SkippedShared = rechecked.sharedKeys.length;
      await removePendingS3Keys(db, deletionId, rechecked.sharedKeys);

      if (rechecked.deleteKeys.length && external?.deleteS3Objects) {
        try {
          const result = await external.deleteS3Objects(rechecked.deleteKeys);
          const failed = new Set(result.failed || []);
          const hasUnknownFailure = Array.from(failed).some(
            (key) => !rechecked.deleteKeys.includes(key),
          );
          const completedKeys = hasUnknownFailure
            ? []
            : result.failed?.length
              ? rechecked.deleteKeys.filter((key) => !failed.has(key))
              : result.affectedRows >= rechecked.deleteKeys.length
                ? rechecked.deleteKeys
                : [];
          s3Deleted = completedKeys.length;
          await removePendingS3Keys(db, deletionId, completedKeys);
        } catch (error) {
          console.error("Account deletion S3 removal failed", error);
        }
      }
    } catch (error) {
      console.error("Account deletion S3 reference recheck failed", error);
    }
  }
  entries.push(reportEntry("s3", "deleted", s3Deleted));
  entries.push(
    reportEntry(
      "s3",
      "skipped_shared",
      s3SkippedShared,
      s3SkippedShared
        ? "Retained because a surviving file record uses the same content hash"
        : undefined,
    ),
  );

  let stripeDeleted = 0;
  let stripeSkippedShared = 0;
  if (externalJob.pendingStripeCustomerId) {
    const customerId = externalJob.pendingStripeCustomerId;
    try {
      const sharedCustomer = await db
        .collection("users")
        .findOne({ stripeCustomerId: customerId }, { projection: { _id: 1 } });
      if (sharedCustomer) {
        stripeSkippedShared = 1;
        await removePendingStripeCustomer(db, deletionId, customerId);
      } else if (external?.deleteStripeCustomer) {
        try {
          const result = await external.deleteStripeCustomer(customerId);
          if (!result.failed?.length && result.affectedRows >= 1) {
            stripeDeleted = 1;
            await removePendingStripeCustomer(db, deletionId, customerId);
          }
        } catch (error) {
          console.error("Account deletion Stripe removal failed", error);
        }
      }
    } catch (error) {
      console.error("Account deletion Stripe reference recheck failed", error);
    }
  }
  entries.push(reportEntry("stripe", "deleted", stripeDeleted));
  entries.push(
    reportEntry(
      "stripe",
      "skipped_shared",
      stripeSkippedShared,
      stripeSkippedShared
        ? "Retained because a surviving user references the same Stripe customer"
        : undefined,
    ),
  );

  const remaining = await jobs.findOne({ _id: deletionId });
  const remainingS3Count = remaining?.pendingS3Keys?.length || 0;
  const remainingStripeCount = remaining?.pendingStripeCustomerId ? 1 : 0;
  if (!remaining || (!remainingS3Count && !remainingStripeCount)) {
    await jobs.deleteOne({ _id: deletionId });
    return {
      collections: databaseCollections,
      resources: mergedReportEntries([...persistedResourceEntries, ...entries]),
      status: "complete",
      targetUserId: job.targetUserId.toHexString(),
    };
  }

  if (remainingS3Count) {
    entries.push(
      reportEntry(
        "s3",
        "retained",
        remainingS3Count,
        "Queued for administrator retry",
      ),
    );
  }
  if (remainingStripeCount) {
    entries.push(
      reportEntry(
        "stripe",
        "retained",
        remainingStripeCount,
        "Queued for administrator retry",
      ),
    );
  }

  return {
    collections: databaseCollections,
    deletionId: deletionId.toHexString(),
    resources: mergedReportEntries([...persistedResourceEntries, ...entries]),
    status: "partial",
    targetUserId: job.targetUserId.toHexString(),
  };
}

export async function deleteAccountData({
  client,
  db,
  external,
  targetUserId: rawTargetUserId,
}: DeleteAccountDataOptions): Promise<AccountDeletionReport> {
  const targetUserId = objectIdFrom(rawTargetUserId);
  await assertTransactionalDeletionTopology(client);
  await ensureAdminDeletionGuard(db);
  const phaseOne = await client.withSession((session) =>
    session.withTransaction(
      () => beginAccountDeletion(db, targetUserId, session),
      transactionOptions,
    ),
  );

  if (!phaseOne) return notFoundReport(targetUserId);

  try {
    return await retryAccountDeletionJob({
      client,
      db,
      deletionId: phaseOne.deletionId,
      external,
    });
  } catch (error) {
    if (error instanceof AccountDeletionJobNotFoundError) {
      return {
        collections: [],
        resources: [],
        status: "complete",
        targetUserId: targetUserId.toHexString(),
      };
    }
    console.error("Inline account-deletion job processing failed", error);

    return {
      collections: phaseOne.revokedSessions
        ? [
            reportEntry(
              "sessions",
              "deleted",
              phaseOne.revokedSessions,
              "Revoked when account deletion entered its pending phase",
            ),
          ]
        : [],
      deletionId: phaseOne.deletionId.toHexString(),
      resources: [
        reportEntry(
          "account_deletion",
          "retained",
          1,
          "Queued for administrator retry",
        ),
      ],
      status: "partial",
      targetUserId: targetUserId.toHexString(),
    };
  }
}
