# Account data and provider-log privacy follow-ups

## Current boundary

`userRequests` is the account-owned usage ledger. It contains one aggregate per
user per UTC day: request count and free/paid credit totals. It must not contain
request IDs, provider call IDs, model inputs, prompts, images, or exact request
times.

`bananaRequests` and `csends` are raw operational provider logs. They may retain
full prompts and link to each other using provider request/container IDs, but
they must not contain an account/user ID or be joined from account-owned data.
They are intentionally outside account ZIP exports and account deletion.

`stars` remains account-owned. Starred records and their ZIP export intentionally
retain full, unredacted prompts and other generation settings.

## Required one-off migration

Deploy the future-write changes before or together with this migration. Pause
generation traffic while applying the rebuild so a concurrent daily-ledger
increment cannot be lost. First run a read-only report against the intended
database:

```sh
MONGO_URL='…' MONGO_DB_NAME='sd-mui' pnpm privacy:unlink-provider-logs
```

Review the counts, then apply the atomic rebuild:

```sh
MONGO_URL='…' MONGO_DB_NAME='sd-mui' pnpm privacy:unlink-provider-logs -- --apply
```

Run the dry report again. `legacyIdentifierDocuments` must be zero. The job
whitelists the daily ledger fields and atomically replaces `userRequests`; it
does not create a legacy backup because that would preserve the link being
removed. Existing infrastructure backups should be protected by the same
restricted access and retention controls as other sensitive historical data.

## Remaining high-value recommendations

1. Define and enforce a retention period (preferably a TTL or scheduled purge)
   for raw prompts and provider telemetry. Schema unlinking reduces association;
   it does not make self-identifying prompt text anonymous.
2. Put raw provider logs behind a separate database role or service boundary,
   with audited, least-privilege admin access. Application account-data code
   should have no read or delete permission for these collections.
3. Review which raw metadata is operationally necessary. Exact timestamps,
   uncommon settings, and provider identifiers can aid correlation even without
   a direct account key; coarsen or remove them where diagnostics permit.
4. Document and periodically verify upstream provider retention and deletion
   behavior. This repository can only control its own copies of requests.
5. Stop embedding prompts and settings in generated filenames when that work is
   prioritized; filenames can leak content through downloads, logs, and object
   metadata.
6. Add the separately planned starred-image archive. Keep its inclusion of full
   prompts explicit in the UI and tests, because starred content is intentionally
   account-associated and differs from anonymous operational logs.
