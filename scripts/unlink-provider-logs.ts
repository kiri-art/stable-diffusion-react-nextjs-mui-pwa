import process from "node:process";
import { MongoClient } from "mongodb";

import { unlinkHistoricalProviderLogs } from "../src/server/account-data/accountUsage.ts";

function printHelp() {
  console.log(`Usage: pnpm privacy:unlink-provider-logs [-- --apply]

Rebuilds userRequests as daily account/billing aggregates. Raw bananaRequests
and csends are never read or modified. The default is a read-only dry run.

Environment:
  MONGO_URL       MongoDB connection string (default: mongodb://127.0.0.1)
  MONGO_DB_NAME   Database name (default: sd-mui)`);
}

const args = new Set(process.argv.slice(2));
if (args.has("--help") || args.has("-h")) {
  printHelp();
  process.exit(0);
}
const allowedArgs = new Set(["--apply"]);
const unknownArgs = [...args].filter((arg) => !allowedArgs.has(arg));
if (unknownArgs.length) {
  throw new Error(`Unknown argument(s): ${unknownArgs.join(", ")}`);
}

const client = new MongoClient(process.env.MONGO_URL || "mongodb://127.0.0.1");
try {
  await client.connect();
  const report = await unlinkHistoricalProviderLogs(
    client.db(process.env.MONGO_DB_NAME || "sd-mui"),
    { apply: args.has("--apply") },
  );
  console.log(JSON.stringify(report, null, 2));
  if (!report.applied) {
    console.log("Dry run only. Re-run with --apply to replace legacy rows.");
  }
} finally {
  await client.close();
}
