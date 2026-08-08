import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import React from "react";

import AccountDeletionReportView, {
  getAccountDeletionApiError,
  isAccountDeletionReport,
} from "../account/AccountDeletionReportView";
import asyncConfirm from "../asyncConfirm";
import type { AccountDeletionReport } from "../server/account-data";

interface AdminDeletionTarget {
  admin: boolean;
  createdAt: string | null;
  displayName: string | null;
  email: string | null;
  id: string;
}

type BusyAction = "delete" | "preview" | "retry" | "search" | null;

function isTarget(value: unknown): value is AdminDeletionTarget {
  if (!value || typeof value !== "object") return false;
  const target = value as Partial<AdminDeletionTarget>;
  return (
    typeof target.id === "string" &&
    (typeof target.email === "string" || target.email === null) &&
    (typeof target.displayName === "string" || target.displayName === null) &&
    (typeof target.createdAt === "string" || target.createdAt === null) &&
    typeof target.admin === "boolean"
  );
}

function isSearchResponse(
  value: unknown,
): value is { results: AdminDeletionTarget[] } {
  if (!value || typeof value !== "object") return false;
  const results = (value as { results?: unknown }).results;
  return Array.isArray(results) && results.every(isTarget);
}

function isPreviewResponse(value: unknown): value is {
  intent: string;
  preview: AccountDeletionReport;
  target: AdminDeletionTarget;
} {
  if (!value || typeof value !== "object") return false;
  const preview = value as {
    intent?: unknown;
    preview?: unknown;
    target?: unknown;
  };
  return (
    typeof preview.intent === "string" &&
    isAccountDeletionReport(preview.preview) &&
    isTarget(preview.target)
  );
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : t`The request failed.`;
}

function formatCreatedAt(createdAt: string | null): string {
  if (!createdAt) return t`Unknown`;
  const date = new Date(createdAt);
  return Number.isNaN(date.getTime()) ? createdAt : date.toLocaleString();
}

async function postAccountDeletion(
  body: Record<string, unknown>,
  actionHeader?: "admin-delete" | "admin-delete-retry",
): Promise<unknown> {
  const response = await fetch("/api/admin/accountDeletion", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(actionHeader ? { "x-kiri-account-action": actionHeader } : {}),
    },
    body: JSON.stringify(body),
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(getAccountDeletionApiError(response, payload));
  }
  return payload;
}

function CanonicalIdentity({ target }: { target: AdminDeletionTarget }) {
  useLingui();
  return (
    <Box
      component="dl"
      sx={{
        display: "grid",
        gap: 1,
        gridTemplateColumns: { sm: "max-content minmax(0, 1fr)" },
        m: 0,
        "& dd": { m: 0, minWidth: 0 },
        "& dt": { color: "text.secondary", fontWeight: 600 },
      }}
    >
      <Typography component="dt">
        <Trans>Email</Trans>
      </Typography>
      <Typography component="dd">{target.email || t`Not set`}</Typography>
      <Typography component="dt">
        <Trans>Display name</Trans>
      </Typography>
      <Typography component="dd">{target.displayName || t`Not set`}</Typography>
      <Typography component="dt">
        <Trans>Immutable user ID</Trans>
      </Typography>
      <Typography component="dd" sx={{ overflowWrap: "anywhere" }}>
        <code>{target.id}</code>
      </Typography>
      <Typography component="dt">
        <Trans>Created</Trans>
      </Typography>
      <Typography component="dd">
        {formatCreatedAt(target.createdAt)}
      </Typography>
      <Typography component="dt">
        <Trans>Administrator</Trans>
      </Typography>
      <Typography component="dd">
        {target.admin ? <Trans>Yes</Trans> : <Trans>No</Trans>}
      </Typography>
    </Box>
  );
}

export default function AccountDeletionDangerZone() {
  useLingui();
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<AdminDeletionTarget[]>([]);
  const [searchComplete, setSearchComplete] = React.useState(false);
  const [target, setTarget] = React.useState<AdminDeletionTarget | null>(null);
  const [preview, setPreview] = React.useState<AccountDeletionReport | null>(
    null,
  );
  const [intent, setIntent] = React.useState("");
  const [confirmation, setConfirmation] = React.useState("");
  const [report, setReport] = React.useState<AccountDeletionReport | null>(
    null,
  );
  const [retryDeletionId, setRetryDeletionId] = React.useState("");
  const [retryReport, setRetryReport] =
    React.useState<AccountDeletionReport | null>(null);
  const [busy, setBusy] = React.useState<BusyAction>(null);
  const [error, setError] = React.useState("");

  const resetSelection = React.useCallback(() => {
    setTarget(null);
    setPreview(null);
    setIntent("");
    setConfirmation("");
    setReport(null);
  }, []);

  function changeQuery(event: React.ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value);
    setResults([]);
    setSearchComplete(false);
    setError("");
    resetSelection();
  }

  async function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedQuery = query.trim();
    if (!normalizedQuery || busy) return;

    setBusy("search");
    setError("");
    setResults([]);
    setSearchComplete(false);
    resetSelection();

    try {
      const payload = await postAccountDeletion({
        action: "search",
        query: normalizedQuery,
      });
      if (!isSearchResponse(payload)) {
        throw new Error(t`The server returned invalid search results.`);
      }
      setResults(payload.results);
      setSearchComplete(true);
    } catch (caught) {
      setError(formatError(caught));
    } finally {
      setBusy(null);
    }
  }

  async function verifyAndPreview(selectedTarget: AdminDeletionTarget) {
    if (busy) return;
    setBusy("preview");
    setError("");
    resetSelection();

    try {
      const payload = await postAccountDeletion({
        action: "preview",
        targetUserId: selectedTarget.id,
      });
      if (!isPreviewResponse(payload)) {
        throw new Error(t`The server returned an invalid deletion preview.`);
      }
      setTarget(payload.target);
      setPreview(payload.preview);
      setIntent(payload.intent);
    } catch (caught) {
      setError(formatError(caught));
    } finally {
      setBusy(null);
    }
  }

  async function deleteAccount() {
    if (!target || !preview || !intent || busy || report) return;
    const requiredConfirmation = `DELETE ${target.id}`;
    if (confirmation !== requiredConfirmation) return;

    const confirmed = await asyncConfirm({
      title: t`Permanently delete this user?`,
      text: t`This is the final confirmation for ${target.email || target.displayName || target.id} (${target.id}). This action cannot be undone.`,
      ok: t`Permanently delete`,
      cancel: t`Cancel`,
    });
    if (!confirmed) return;

    setBusy("delete");
    setError("");

    try {
      const payload = await postAccountDeletion(
        {
          action: "delete",
          confirmation: requiredConfirmation,
          intent,
          targetUserId: target.id,
        },
        "admin-delete",
      );
      if (!isAccountDeletionReport(payload)) {
        throw new Error(t`The server returned an invalid deletion report.`);
      }
      setReport(payload);
      if (payload.deletionId) setRetryDeletionId(payload.deletionId);
    } catch (caught) {
      setError(formatError(caught));
    } finally {
      setBusy(null);
    }
  }

  async function retryCleanup() {
    if (busy) return;
    const normalizedDeletionId = retryDeletionId.trim().toLowerCase();
    if (!/^[a-f0-9]{24}$/.test(normalizedDeletionId)) return;

    const confirmed = await asyncConfirm({
      title: t`Retry queued cleanup?`,
      text: t`Retry external cleanup receipt ${normalizedDeletionId}? This may permanently remove queued S3 or Stripe resources.`,
      ok: t`Retry cleanup`,
      cancel: t`Cancel`,
    });
    if (!confirmed) return;

    setBusy("retry");
    setError("");
    setRetryReport(null);

    try {
      const payload = await postAccountDeletion(
        {
          action: "retry",
          confirmation: `RETRY ${normalizedDeletionId}`,
          deletionId: normalizedDeletionId,
        },
        "admin-delete-retry",
      );
      if (!isAccountDeletionReport(payload)) {
        throw new Error(t`The server returned an invalid cleanup report.`);
      }
      setRetryDeletionId(normalizedDeletionId);
      setRetryReport(payload);
    } catch (caught) {
      setError(formatError(caught));
    } finally {
      setBusy(null);
    }
  }

  const requiredConfirmation = target ? `DELETE ${target.id}` : "";
  const validRetryDeletionId = /^[a-f0-9]{24}$/i.test(retryDeletionId.trim());

  return (
    <Paper
      component="section"
      aria-labelledby="admin-delete-account-heading"
      variant="outlined"
      sx={{ borderColor: "error.main", mt: 5, p: { xs: 2, sm: 3 } }}
    >
      <Stack spacing={2.5}>
        <Box>
          <Typography
            color="error.main"
            sx={{ fontWeight: 700, letterSpacing: "0.08em" }}
            variant="overline"
          >
            <Trans>Danger zone</Trans>
          </Typography>
          <Typography
            id="admin-delete-account-heading"
            component="h2"
            variant="h5"
          >
            <Trans>Delete a user account</Trans>
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            <Trans>
              Find one exact account, verify its immutable ID and deletion
              preview, then explicitly confirm that same ID.
            </Trans>
          </Typography>
        </Box>

        <Alert severity="warning">
          <Trans>
            Account deletion is permanent. Search only by an exact email address
            or full user ID; partial matching is not supported.
          </Trans>
        </Alert>

        {error ? (
          <Alert severity="error" role="alert">
            {error}
          </Alert>
        ) : null}

        <Box
          component="section"
          aria-labelledby="retry-account-cleanup-heading"
        >
          <Typography
            id="retry-account-cleanup-heading"
            component="h3"
            variant="h6"
          >
            <Trans>Retry queued external cleanup</Trans>
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 1.5 }}>
            <Trans>
              If a deletion report was partial, enter its cleanup receipt ID to
              retry the remaining provider operations.
            </Trans>
          </Typography>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{ alignItems: { sm: "flex-start" } }}
          >
            <TextField
              disabled={busy !== null}
              fullWidth
              helperText={t`Enter the 24-character cleanup receipt ID from the deletion report.`}
              label={t`Cleanup receipt ID`}
              onChange={(event) => {
                setRetryDeletionId(event.target.value);
                setRetryReport(null);
                setError("");
              }}
              slotProps={{ htmlInput: { spellCheck: false } }}
              value={retryDeletionId}
            />
            <Button
              color="error"
              disabled={!validRetryDeletionId || busy !== null}
              onClick={retryCleanup}
              startIcon={
                busy === "retry" ? (
                  <CircularProgress color="inherit" size={18} />
                ) : undefined
              }
              sx={{ minWidth: 170, mt: { sm: 1 } }}
              variant="outlined"
            >
              {busy === "retry" ? (
                <Trans>Retrying cleanup…</Trans>
              ) : (
                <Trans>Retry cleanup</Trans>
              )}
            </Button>
          </Stack>
          {retryReport ? (
            <AccountDeletionReportView
              report={retryReport}
              title={t`Cleanup retry report`}
            />
          ) : null}
        </Box>

        <Divider />

        <Typography component="h3" variant="h6">
          <Trans>Find an account to delete</Trans>
        </Typography>

        <Box component="form" onSubmit={search}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1.5}
            sx={{ alignItems: { sm: "flex-start" } }}
          >
            <TextField
              disabled={busy !== null}
              fullWidth
              helperText={t`Enter the complete email address or 24-character user ID.`}
              label={t`Exact email or user ID`}
              onChange={changeQuery}
              value={query}
            />
            <Button
              disabled={!query.trim() || busy !== null}
              startIcon={
                busy === "search" ? (
                  <CircularProgress color="inherit" size={18} />
                ) : undefined
              }
              sx={{ minWidth: 150, mt: { sm: 1 } }}
              type="submit"
              variant="contained"
            >
              {busy === "search" ? (
                <Trans>Searching…</Trans>
              ) : (
                <Trans>Search</Trans>
              )}
            </Button>
          </Stack>
        </Box>

        {searchComplete && results.length === 0 ? (
          <Alert severity="info">
            <Trans>No user matched that exact value.</Trans>
          </Alert>
        ) : null}

        {results.length > 0 ? (
          <Stack aria-label={t`Exact account matches`} spacing={1.5}>
            <Typography component="h3" variant="h6">
              {results.length === 1 ? (
                <Trans>Exact match</Trans>
              ) : (
                <Trans>Exact matches</Trans>
              )}
            </Typography>
            {results.map((result) => (
              <Paper key={result.id} sx={{ p: 2 }} variant="outlined">
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  sx={{
                    alignItems: { sm: "flex-end" },
                    justifyContent: "space-between",
                  }}
                >
                  <CanonicalIdentity target={result} />
                  <Button
                    disabled={busy !== null}
                    onClick={() => verifyAndPreview(result)}
                    startIcon={
                      busy === "preview" ? (
                        <CircularProgress color="inherit" size={18} />
                      ) : undefined
                    }
                    variant="outlined"
                  >
                    <Trans>Verify and preview</Trans>
                  </Button>
                </Stack>
              </Paper>
            ))}
          </Stack>
        ) : null}

        {target && preview ? (
          <>
            <Divider />
            <Box>
              <Typography component="h3" variant="h6" gutterBottom>
                <Trans>Verified target</Trans>
              </Typography>
              <CanonicalIdentity target={target} />
            </Box>

            {target.admin ? (
              <Alert severity="error">
                <Trans>
                  This account has administrator privileges. Confirm the user ID
                  with particular care.
                </Trans>
              </Alert>
            ) : null}

            {report ? (
              <AccountDeletionReportView report={report} />
            ) : (
              <>
                <AccountDeletionReportView mode="preview" report={preview} />
                <Typography>
                  <Trans>To enable deletion, type this exact phrase:</Trans>
                </Typography>
                <Box
                  component="code"
                  sx={{
                    alignSelf: "flex-start",
                    bgcolor: "action.hover",
                    borderRadius: 1,
                    overflowWrap: "anywhere",
                    px: 1.5,
                    py: 1,
                  }}
                >
                  {requiredConfirmation}
                </Box>
                <TextField
                  autoComplete="off"
                  disabled={busy !== null}
                  fullWidth
                  label={t`Confirm the immutable user ID`}
                  onChange={(event) => setConfirmation(event.target.value)}
                  slotProps={{ htmlInput: { spellCheck: false } }}
                  value={confirmation}
                />
                <Box>
                  <Button
                    color="error"
                    disabled={
                      confirmation !== requiredConfirmation || busy !== null
                    }
                    onClick={deleteAccount}
                    startIcon={
                      busy === "delete" ? (
                        <CircularProgress color="inherit" size={18} />
                      ) : undefined
                    }
                    variant="contained"
                  >
                    {busy === "delete" ? (
                      <Trans>Deleting account…</Trans>
                    ) : (
                      <Trans>Permanently delete this account</Trans>
                    )}
                  </Button>
                </Box>
              </>
            )}
          </>
        ) : null}
      </Stack>
    </Paper>
  );
}
