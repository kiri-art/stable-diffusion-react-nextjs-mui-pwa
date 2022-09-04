import React from "react";
import { useRouter } from "next/router";
import { t, Trans } from "@lingui/macro";
import { useGongoUserId, useGongoOne } from "gongo-client-react";

import { Box, Button, Container, Typography } from "@mui/material";

import MyAppBar from "../src/MyAppBar";

export default function Credits() {
  const router = useRouter();
  const userId = useGongoUserId();
  const user = useGongoOne((db) =>
    db.collection("users").find({ _id: userId })
  );

  if (!userId) {
    router.push("/login?from=/credits");
    return null;
  }

  return (
    <>
      <MyAppBar title={t`My Credits`} />
      <Container maxWidth="lg" sx={{ my: 2 }}>
        <Typography variant="h6">
          <Trans>Total Credits</Trans>:{" "}
          {user.credits.free + user.credits.purchased}
        </Typography>
        <Trans>Total credits available for immediate use.</Trans>

        <Typography variant="h6" sx={{ mt: 2 }}>
          <Trans>Free Credits</Trans>: {user.credits.free}
        </Typography>
        <Trans>
          You receive free credits every month. They are used before your paid
          credits. Unused credits don&apos;t carry over.
        </Trans>

        <Typography variant="h6" sx={{ mt: 2 }}>
          <Trans>Purchased Credits</Trans>: {user.credits.free}
        </Typography>
        <Trans>
          Purchased credits are used after you run out of free credits that
          month, and don&apos;t expire.
        </Trans>

        <Box>
          <Button variant="contained" disabled sx={{ mt: 2 }}>
            <Trans>Buy 50 credits for $1</Trans>
          </Button>{" "}
          <span
            style={{
              verticalAlign: "middle",
              position: "relative",
              top: "8px",
            }}
          >
            (<Trans>COMING SOON</Trans>)
          </span>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Trans>
            This project is community run by volunteers in our spare time. We
            make no guarantees. It could stop working at any time, and no
            refunds will be provided. To that end, it is only possible to buy $1
            worth of credits at a time.
          </Trans>
        </Box>
      </Container>
    </>
  );
}
