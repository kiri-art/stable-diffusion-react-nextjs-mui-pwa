import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { db } from "gongo-client-react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import React from "react";
import { flushSync } from "react-dom";
import AccountDeletionReportView, {
  getAccountDeletionApiError,
  isAccountDeletionReport,
} from "../../src/account/AccountDeletionReportView";
import asyncConfirm from "../../src/asyncConfirm";
import MyAppBar from "../../src/MyAppBar";
import type { AccountDeletionReport } from "../../src/server/account-data";

const DELETE_CONFIRMATION = "PERMANENTLY ERASE MY DATA";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : t`The request failed.`;
}

function clearGongoDeviceData() {
  // `_remove` is Gongo's local-only removal primitive. Using it here clears
  // in-memory and IndexedDB copies without queueing new server mutations after
  // the server has already erased the account.
  for (const [collectionName, collection] of db.collections) {
    for (const id of Array.from(collection.documents.keys())) {
      if (collectionName === "__gongoStore" && id === "auth") continue;
      collection._remove(id);
    }
  }
}

async function clearCurrentDeviceAccountData(): Promise<string[]> {
  const warnings: string[] = [];

  try {
    clearGongoDeviceData();
  } catch {
    warnings.push(t`Some cached data could not be cleared from this device.`);
  }

  try {
    if (!db.auth) throw new Error("Gongo authentication is unavailable");
    await db.auth.clear();
  } catch {
    warnings.push(t`The local Gongo session could not be cleared.`);
  }

  try {
    await db.idb.deleteDB();
  } catch {
    warnings.push(t`The local browser database could not be deleted.`);
  }

  try {
    await signOut({ redirect: false });
  } catch {
    warnings.push(
      t`The browser session could not be signed out automatically.`,
    );
  }

  return warnings;
}

export default function AccountData() {
  useLingui();
  const [confirmation, setConfirmation] = React.useState("");
  const [destroying, setDestroying] = React.useState(false);
  const [error, setError] = React.useState("");
  const [cleanupWarnings, setCleanupWarnings] = React.useState<string[]>([]);
  const [report, setReport] = React.useState<AccountDeletionReport | null>(
    null,
  );

  async function destroy() {
    if (confirmation !== DELETE_CONFIRMATION || destroying || report) return;

    const confirmed = await asyncConfirm({
      title: t`Permanently delete your account?`,
      text: t`This is the final confirmation. Your account and associated data will be erased, and this action cannot be undone.`,
      ok: t`Permanently delete`,
      cancel: t`Keep my account`,
    });
    if (!confirmed) return;

    setDestroying(true);
    setError("");
    setCleanupWarnings([]);

    try {
      const response = await fetch("/api/myDataDelete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-kiri-account-action": "delete",
        },
        body: JSON.stringify({ confirmation: DELETE_CONFIRMATION }),
      });
      const payload: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getAccountDeletionApiError(response, payload));
      }
      if (!isAccountDeletionReport(payload)) {
        throw new Error(t`The server returned an invalid deletion report.`);
      }

      // Commit the server's report before local auth/cache state changes. The
      // page deliberately remains mounted after sign-out so this stays visible.
      flushSync(() => setReport(payload));
      if (payload.status === "complete" || payload.status === "partial") {
        setCleanupWarnings(await clearCurrentDeviceAccountData());
      }
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setDestroying(false);
    }
  }

  return (
    <>
      <MyAppBar title={t`My Data`} />
      <Container sx={{ py: 3 }}>
        <Typography component="h1" variant="h5">
          <Trans>Privacy</Trans>
        </Typography>
        <Box component="ul" sx={{ "& li": { mb: 1 } }}>
          <li>
            <Trans>
              Your data is stored in our database in <b>Paris, France</b>.
            </Trans>
          </li>
          <li>
            <Trans>
              Your <b>history</b> is stored on your local device only, and is
              not backed up to our servers.
            </Trans>{" "}
            <Trans>
              Account usage records contain daily billing totals only. Separate
              provider logs retain generation inputs, including full prompts,
              without an account identifier; they are not included in account
              downloads or account deletion. Starred records retain full,
              unredacted prompts, and starred images are stored on our servers.
            </Trans>
          </li>
          <li>
            <Trans>
              Your <b>IP address</b> and user agent is recorded on each
              successful log in.
            </Trans>
          </li>
          <li>
            <Trans>
              See also our <Link href="/tos.html">Terms of Service</Link> and{" "}
              <Link href="/privacy">Privacy Policy</Link>
            </Trans>
          </li>
        </Box>

        <Typography component="p" sx={{ mt: 2 }}>
          <Trans>
            You can download associated database records and file metadata as a
            ZIP archive of JSON collections. The archive does not include
            starred image files themselves.
          </Trans>
        </Typography>
        <Button component="a" href="/api/myData" variant="contained">
          <Trans>Download account data (ZIP)</Trans>
        </Button>

        <Paper
          component="section"
          aria-labelledby="delete-account-heading"
          variant="outlined"
          sx={{
            borderColor: "error.main",
            mt: 5,
            p: { xs: 2, sm: 3 },
          }}
        >
          <Stack spacing={2}>
            <Box>
              <Typography
                id="delete-account-heading"
                component="h2"
                color="error.main"
                variant="h5"
              >
                <Trans>Delete My Account</Trans>
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                <Trans>
                  This permanently deletes your account and associated data.
                  Billing orders may be anonymized and retained when legally or
                  operationally required.
                </Trans>
              </Typography>
            </Box>

            {error ? (
              <Alert severity="error" role="alert">
                {error}
              </Alert>
            ) : null}

            {cleanupWarnings.length > 0 ? (
              <Alert severity="warning">
                <Typography component="p">
                  <Trans>
                    Server deletion finished, but local cleanup needs attention:
                  </Trans>
                </Typography>
                <Box component="ul" sx={{ mb: 0, mt: 1, pl: 3 }}>
                  {cleanupWarnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </Box>
              </Alert>
            ) : null}

            {report ? (
              <AccountDeletionReportView report={report} />
            ) : (
              <>
                <Typography>
                  <Trans>
                    To continue, type the phrase below exactly. You will be
                    asked to confirm once more before deletion starts.
                  </Trans>
                </Typography>
                <Box
                  component="code"
                  sx={{
                    alignSelf: "flex-start",
                    bgcolor: "action.hover",
                    borderRadius: 1,
                    px: 1.5,
                    py: 1,
                  }}
                >
                  {DELETE_CONFIRMATION}
                </Box>
                <TextField
                  autoComplete="off"
                  disabled={destroying}
                  fullWidth
                  label={t`Confirmation phrase`}
                  onChange={(event) => setConfirmation(event.target.value)}
                  slotProps={{
                    htmlInput: {
                      "aria-describedby": "delete-account-help",
                      spellCheck: false,
                    },
                  }}
                  value={confirmation}
                />
                <Typography
                  id="delete-account-help"
                  color="text.secondary"
                  variant="body2"
                >
                  <Trans>Capitalization and spaces must match.</Trans>
                </Typography>
                <Box>
                  <Button
                    color="error"
                    disabled={
                      confirmation !== DELETE_CONFIRMATION || destroying
                    }
                    onClick={destroy}
                    startIcon={
                      destroying ? (
                        <CircularProgress color="inherit" size={18} />
                      ) : undefined
                    }
                    variant="contained"
                  >
                    {destroying ? (
                      <Trans>Deleting account…</Trans>
                    ) : (
                      <Trans>Permanently delete my account</Trans>
                    )}
                  </Button>
                </Box>
              </>
            )}

            <Typography color="text.secondary" variant="body2">
              <Trans>
                Local history is cleared on this device after deletion. On any
                other device where you used the app, uninstall it or clear its
                browser storage separately.
              </Trans>
            </Typography>
          </Stack>
        </Paper>
      </Container>
    </>
  );
}
