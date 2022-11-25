import { buffer } from "micro";
import Cors from "micro-cors";
import { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

import { dba } from "../../src/api-lib/db";

if (!process.env.STRIPE_SECRET_KEY)
  throw new Error("process.env.STRIPE_SECRET_KEY not set");

if (!process.env.STRIPE_WEBHOOK_SECRET)
  throw new Error("process.env.STRIPE_WEBHOOK_SECRET not set");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  // https://github.com/stripe/stripe-node#configuration
  apiVersion: "2022-08-01",
});

const webhookSecret: string = process.env.STRIPE_WEBHOOK_SECRET;

// Stripe requires the raw body to construct the event.
export const config = {
  api: {
    bodyParser: false,
  },
};

const cors = Cors({
  allowMethods: ["POST", "HEAD"],
});

const webhookHandler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "POST") {
    const buf = await buffer(req);

    if (!req.headers["stripe-signature"])
      throw new Error("No stripe-signature");

    const sig = req.headers["stripe-signature"];

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        buf.toString(),
        sig,
        webhookSecret
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      // On error, log and return the error message.
      if (err instanceof Error) console.log(err);
      console.log(`❌ Error message: ${errorMessage}`);
      res.status(400).send(`Webhook Error: ${errorMessage}`);
      return;
    }

    // Successfully constructed event.
    console.log("✅ Success:", event.id);

    // Cast event data to Stripe object.
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log(`💰 PaymentIntent status: ${paymentIntent.status}`);

      const order = await (dba &&
        dba
          .collection("orders")
          .findOne({ stripePaymentIntentId: paymentIntent.id }));

      if (!order) {
        throw new Error(
          "Could not find order with matching stripePaymentIntentId: " +
            paymentIntent.id
        );
      }

      await (dba &&
        dba
          .collection("orders")
          .updateOne(
            { stripePaymentIntentId: paymentIntent.id },
            { $set: { stripePaymentIntentStatus: paymentIntent.status } }
          ));

      await (dba &&
        dba.collection("users").updateOne(
          {
            _id: order.userId,
          },
          {
            $inc: { "credits.paid": order.numCredits },
          }
        ));
    } else if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      console.log(
        `❌ Payment failed: ${paymentIntent.last_payment_error?.message}`
      );

      await (dba &&
        dba.collection("orders").updateOne(
          { stripePaymentIntentId: paymentIntent.id },
          {
            $set: {
              stripePaymentIntentStatus: paymentIntent.status,
              stripePaymentFailedReason:
                paymentIntent.last_payment_error?.message,
            },
          }
        ));
    } else if (event.type === "charge.succeeded") {
      const charge = event.data.object as Stripe.Charge;
      console.log(`💵 Charge id: ${charge.id}`);
    } else {
      console.warn(`🤷‍♀️ Unhandled event type: ${event.type}`);
    }

    // Return a response to acknowledge receipt of the event.
    res.json({ received: true });
  } else {
    res.setHeader("Allow", "POST");
    res.status(405).end("Method Not Allowed");
  }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default cors(webhookHandler as any);
