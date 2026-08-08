import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import {
  Alert,
  Box,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import type React from "react";

import type {
  AccountDataAction,
  AccountDataReportEntry,
  AccountDeletionReport,
} from "../server/account-data";

const accountDataActions = new Set<AccountDataAction>([
  "anonymized",
  "deleted",
  "failed",
  "retained",
  "skipped_shared",
  "updated",
]);

const actionColors: Record<
  AccountDataAction,
  "default" | "error" | "info" | "success" | "warning"
> = {
  anonymized: "info",
  deleted: "success",
  failed: "error",
  retained: "default",
  skipped_shared: "default",
  updated: "info",
};

function isReportEntry(value: unknown): value is AccountDataReportEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<AccountDataReportEntry>;
  return (
    typeof entry.name === "string" &&
    typeof entry.action === "string" &&
    accountDataActions.has(entry.action as AccountDataAction) &&
    typeof entry.affectedRows === "number" &&
    (entry.reason === undefined || typeof entry.reason === "string")
  );
}

export function isAccountDeletionReport(
  value: unknown,
): value is AccountDeletionReport {
  if (!value || typeof value !== "object") return false;
  const report = value as Partial<AccountDeletionReport>;
  return (
    (report.status === "complete" ||
      report.status === "not_found" ||
      report.status === "partial") &&
    (report.deletionId === undefined ||
      typeof report.deletionId === "string") &&
    typeof report.targetUserId === "string" &&
    Array.isArray(report.collections) &&
    report.collections.every(isReportEntry) &&
    Array.isArray(report.resources) &&
    report.resources.every(isReportEntry)
  );
}

export function getAccountDeletionApiError(
  response: Response,
  payload: unknown,
): string {
  if (payload && typeof payload === "object") {
    const error = (payload as { error?: unknown }).error;
    if (typeof error === "string" && error.trim()) return error;
    if (error && typeof error === "object") {
      const message = (error as { message?: unknown }).message;
      if (typeof message === "string" && message.trim()) return message;
    }
  }
  const statusText = response.statusText || t`Unknown error`;
  return t`The request failed (${response.status} ${statusText}).`;
}

interface AccountDeletionReportViewProps {
  mode?: "preview" | "result";
  report: AccountDeletionReport;
  title?: React.ReactNode;
}

export default function AccountDeletionReportView({
  mode = "result",
  report,
  title,
}: AccountDeletionReportViewProps) {
  useLingui();
  const resolvedTitle =
    title ?? (mode === "preview" ? t`Deletion preview` : t`Deletion report`);
  const actionLabels: Record<AccountDataAction, string> = {
    anonymized: t`Anonymized`,
    deleted: t`Deleted`,
    failed: t`Failed`,
    retained: t`Retained`,
    skipped_shared: t`Skipped (shared)`,
    updated: t`Updated`,
  };
  const entries = [
    ...report.collections.map((entry) => ({
      ...entry,
      scope: "database" as const,
    })),
    ...report.resources.map((entry) => ({
      ...entry,
      scope: "external" as const,
    })),
  ];

  const severity =
    report.status === "complete"
      ? "success"
      : report.status === "partial"
        ? "warning"
        : "info";
  const summary =
    mode === "preview"
      ? report.status === "not_found"
        ? t`No account was found for this user ID.`
        : report.status === "partial"
          ? t`Preview ready with items that may require follow-up. Nothing has been deleted yet.`
          : t`Preview ready. Nothing has been deleted yet.`
      : report.status === "complete"
        ? t`Account deletion completed.`
        : report.status === "partial"
          ? t`Account deletion finished with follow-up work required. Review the notes below.`
          : t`No account was found for this user ID.`;

  return (
    <Box aria-live="polite" sx={{ mt: 3 }}>
      <Typography component="h3" variant="h6" gutterBottom>
        {resolvedTitle}
      </Typography>
      <Alert severity={severity} sx={{ mb: entries.length > 0 ? 2 : 0 }}>
        {summary}{" "}
        <Trans>
          Target user ID: <strong>{report.targetUserId}</strong>
        </Trans>
      </Alert>

      {report.deletionId ? (
        <Alert severity="warning" sx={{ mb: entries.length > 0 ? 2 : 0 }}>
          <Typography component="p">
            <Trans>
              External cleanup receipt: <strong>{report.deletionId}</strong>
            </Trans>
          </Typography>
          <Typography component="p" variant="body2">
            <Trans>
              Save this ID. An administrator can use it to retry queued cleanup.
            </Trans>
          </Typography>
        </Alert>
      ) : null}

      {entries.length > 0 ? (
        <TableContainer component={Paper} variant="outlined">
          <Table size="small" aria-label={t`Account deletion report`}>
            <TableHead>
              <TableRow>
                <TableCell>
                  <Trans>Scope</Trans>
                </TableCell>
                <TableCell>
                  <Trans>Name</Trans>
                </TableCell>
                <TableCell>
                  {mode === "preview" ? (
                    <Trans>Planned action</Trans>
                  ) : (
                    <Trans>Action</Trans>
                  )}
                </TableCell>
                <TableCell align="right">
                  <Trans>Affected items</Trans>
                </TableCell>
                <TableCell>
                  <Trans>Notes</Trans>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((entry, index) => (
                <TableRow
                  key={`${entry.scope}-${entry.name}-${entry.action}-${index}`}
                >
                  <TableCell>
                    {entry.scope === "database" ? (
                      <Trans>Database</Trans>
                    ) : (
                      <Trans>External service</Trans>
                    )}
                  </TableCell>
                  <TableCell component="th" scope="row">
                    <code>{entry.name}</code>
                  </TableCell>
                  <TableCell>
                    <Chip
                      color={actionColors[entry.action]}
                      label={actionLabels[entry.action]}
                      size="small"
                      variant={
                        entry.action === "retained" ||
                        entry.action === "skipped_shared"
                          ? "outlined"
                          : "filled"
                      }
                    />
                  </TableCell>
                  <TableCell align="right">{entry.affectedRows}</TableCell>
                  <TableCell>{entry.reason || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : null}
    </Box>
  );
}
