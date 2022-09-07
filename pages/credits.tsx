import React from "react";
import { useRouter } from "next/router";
import { t, Trans } from "@lingui/macro";
import { useGongoUserId, useGongoOne } from "gongo-client-react";
import addMonths from "date-fns/addMonths";
//import RevolutCheckout from "@revolut/checkout";

import { Box, Button, Container, Typography } from "@mui/material";

import MyAppBar from "../src/MyAppBar";
import Link from "../src/Link";

export default function Credits() {
  const router = useRouter();
  const { redirect_status } = router.query;
  const userId = useGongoUserId();
  const user = useGongoOne((db) =>
    db.collection("users").find({ _id: userId })
  );
  const [loading, setLoading] = React.useState(false);

  if (!userId) {
    router.push("/login?from=/credits");
    return null;
  }

  if (!user) return <div>Loading...</div>;

  const renewalDay = user.createdAt.getDate();
  const nextCreditDate = addMonths(new Date(), 1);
  nextCreditDate.setDate(renewalDay);

  async function buy(event: React.SyntheticEvent) {
    event.preventDefault();
    setLoading(true);

    // @ts-expect-error: TODO
    const auth = db.auth.authInfoToSend();
    const response = await fetch("/api/createStripePaymentIntent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ auth }),
    });

    // clientSecret, orderId
    const json = await response.json();
    const params = new URLSearchParams(json);
    return router.push("/checkout?" + params.toString());
  }

  return (
    <>
      <MyAppBar title={t`My Credits`} />
      <Container maxWidth="lg" sx={{ my: 2 }}>
        {redirect_status === "succeeded" && (
          <Box sx={{ color: "red", mb: 2 }}>
            <Trans>Purchase Successful!</Trans>
          </Box>
        )}
        <Typography variant="h6">
          <Trans>Total Credits</Trans>: {user.credits.free + user.credits.paid}
        </Typography>
        <Trans>Total credits available for immediate use.</Trans>

        <Typography variant="h6" sx={{ mt: 2 }}>
          <Trans>Free Credits</Trans>: {user.credits.free}
        </Typography>
        <Trans>
          You receive free credits every month. They are used before your paid
          credits. Unused credits don&apos;t carry over.
        </Trans>
        <p>
          <Trans>Next credits on:</Trans>
          {nextCreditDate.toLocaleDateString()}
        </p>

        <Typography variant="h6" sx={{ mt: 2 }}>
          <Trans>Purchased Credits</Trans>: {user.credits.paid}
        </Typography>
        <Trans>
          Purchased credits are used after you run out of free credits that
          month, and don&apos;t expire.
        </Trans>

        <Box>
          <Button
            variant="contained"
            sx={{ mt: 2 }}
            onClick={buy}
            disabled={loading}
          >
            {loading ? (
              <Trans>Please wait...</Trans>
            ) : (
              <Trans>Buy 50 credits for $1</Trans>
            )}
          </Button>
        </Box>

        <Box sx={{ my: 2, fontSize: "80%" }}>
          <Trans>
            The charge will appear from "Wastelands Networking" or "Wastelands*
            SD-MUI".
          </Trans>
        </Box>

        <Box sx={{ my: 2 }}>
          <Trans>
            This project is community run by volunteers in our spare time. We
            make no guarantees. It could stop working at any time, and no
            refunds will be provided. To that end, it is only possible to buy $1
            worth of credits at a time.
          </Trans>
        </Box>

        <Button component={Link} variant="outlined" href="/orders">
          <Trans>Order History</Trans>
        </Button>
      </Container>
    </>
  );
}
