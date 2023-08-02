import {
  useStripe,
  useElements,
  PaymentElement,
  LinkAuthenticationElement,
} from "@stripe/react-stripe-js";
import React, { SyntheticEvent } from "react";
import { Trans } from "@lingui/macro";

import { Box, Button } from "@mui/material";
import {
  useGongoOne,
  useGongoUserId,
  useGongoIsPopulated,
} from "gongo-client-react";

export default function CheckoutForm({ orderId }: { orderId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = React.useState(false);
  const isPopulated = useGongoIsPopulated();
  const userId = useGongoUserId();
  const user = useGongoOne((db) =>
    db.collection("users").find({ _id: userId })
  );
  const userEmail =
    user && user.emails && user.emails.length > 0 && user.emails[0].value;

  const handleSubmit = async (event: SyntheticEvent) => {
    // We don't want to let default form submission happen here,
    // which would refresh the page.
    event.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js has not yet loaded.
      // Make sure to disable form submission until Stripe.js has loaded.
      return;
    }

    setLoading(true);

    const result = await stripe.confirmPayment({
      //`Elements` instance that was used to create the Payment Element
      elements,
      confirmParams: {
        // return_url: "https://example.com/order/123/complete",
        return_url: location.origin + "/order/" + orderId, // + "/complete",
      },
    });

    if (result.error) {
      // Show error to your customer (for example, payment details incomplete)
      console.log(result.error); // result.error.message
      setLoading(false);
    } else {
      // Your customer will be redirected to your `return_url`. For some payment
      // methods like iDEAL, your customer will be redirected to an intermediate
      // site first to authorize the payment, then redirected to the `return_url`.
    }
  };

  if (!isPopulated) return <div>Loading...</div>;

  return (
    <form onSubmit={handleSubmit}>
      <LinkAuthenticationElement
        // Optional prop for prefilling customer information
        options={{
          defaultValues: {
            email: userEmail || "",
          },
        }}
      />
      <br />
      <PaymentElement />
      <Button
        type="submit"
        sx={{ my: 2 }}
        variant="contained"
        disabled={!stripe || loading}
      >
        {loading ? <Trans>Please wait...</Trans> : <Trans>Pay</Trans>}
      </Button>

      <Box sx={{ fontSize: "80%" }}>
        <Trans>
          The charge will appear from &quot;Wastelands Networking&quot; or
          &quot;KIRI.ART&quot;.
        </Trans>
      </Box>
    </form>
  );
}
