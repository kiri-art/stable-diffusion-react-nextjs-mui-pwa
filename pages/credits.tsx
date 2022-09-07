import React from "react";
import { useRouter } from "next/router";
import { t, Trans } from "@lingui/macro";
import { db, useGongoUserId, useGongoOne } from "gongo-client-react";
import addMonths from "date-fns/addMonths";
//import RevolutCheckout from "@revolut/checkout";

import { Box, Button, Container, TextField, Typography } from "@mui/material";

import MyAppBar from "../src/MyAppBar";
import Link from "../src/Link";

function RedeemCreditCode() {
  const [creditCode, setCreditCode] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [disabled, setDisabled] = React.useState(false);

  async function go(event: React.SyntheticEvent) {
    event.preventDefault();
    setDisabled(true);
    const result = await db.call("redeemCreditCode", {
      creditCode: creditCode.toUpperCase(),
    });
    setDisabled(false);

    if (!result) return setMessage("Failed with unknown error.");
    if (result.$error) {
      if (result.$error === "NO_SUCH_CODE")
        return setMessage(t`No such code exists.`);
      if (result.$error === "MAXIMUM_REACHED")
        return setMessage(
          t`Code already redeeemed maximum number of times, sorry.`
        );
      if (result.$error === "ALREADY_REDEEMED")
        return setMessage(t`You have already redeemed this code before.`);
      if (typeof result.$error === "string") return setMessage(result.$error);
    }
    if (result.$success)
      return setMessage(t`Successfully redeemed ${result.credits} credits.`);
  }

  return (
    <Box>
      <p>
        <Trans>Redeem Credit Code</Trans>
      </p>
      <form onSubmit={go}>
        <TextField
          size="small"
          value={creditCode}
          onChange={(e) => setCreditCode(e.target.value)}
        />{" "}
        <Button variant="contained" type="submit" disabled={disabled}>
          {disabled ? <Trans>Loading...</Trans> : <Trans>Redeem</Trans>}
        </Button>
        <br />
        {message && <Box sx={{ color: "red", mt: 1 }}>{message}</Box>}
      </form>
    </Box>
  );
}

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
          Your free credits are topped up every month. They are used before your
          paid credits. Unused credits don&apos;t carry over.
        </Trans>
        <p>
          <Trans>Next credits on:</Trans>
          {nextCreditDate.toLocaleDateString()}
        </p>

        <RedeemCreditCode />

        <p>
          <Trans>
            Earn free credits by contributing to the project on GitHub!
          </Trans>
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
            The charge will appear from &quot;Wastelands Networking&quot; or
            &quot;Wastelands* SD-MUI&quot;.
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

        <Box sx={{ fontSize: "80%", py: 2 }}>
          <Trans>
            Reminder: this is Free and Open Source Software. You can run your
            own copy for free on your own PC, with either a suitable graphics
            card or a cheap Banana.Dev acccount. More info on the{" "}
            <Link href="/about">About Page</Link>.
          </Trans>
        </Box>
      </Container>
    </>
  );
}
