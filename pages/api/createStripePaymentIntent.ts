import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

import gs, { Auth, User, Order } from "../../src/api-lib/db";

if (!process.env.STRIPE_SECRET_KEY)
  throw new Error("STRIPE_SECRET_KEY not defined");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2022-08-01",
});

export default async function craeateStripePaymentIntent(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") throw new Error("expected a POST");
  console.log(req.body);
  if (typeof req.body !== "object") throw new Error("Body not decoded");
  if (!gs.dba) throw new Error("gs.dba not defined");

  const auth = new Auth(gs.dba, req.body.auth);
  const userId = await auth.userId();

  if (!userId) {
    return res.status(403).send("Forbidden");
  }

  const user = (await gs.dba
    .collection("users")
    .findOne({ _id: userId })) as User | null;
  if (!user) return res.status(500).send("Server error");

  if (!user.stripeCustomerId) {
    const customer = await stripe.customers.create({
      name: user.displayName,
      email: user.emails[0].value,
    });

    user.stripeCustomerId = customer.id;
    await gs.dba
      .collection("users")
      .updateOne(
        { _id: user._id },
        { $set: { stripeCustomerId: customer.id } }
      );
  }

  const order: Order = {
    userId: userId,
    amount: 100,
    currency: "usd",
    createdAt: new Date(),
  };

  const paymentIntent = await stripe.paymentIntents.create({
    amount: order.amount,
    currency: order.currency,
    automatic_payment_methods: {
      enabled: true,
    },
  });

  order.stripePaymentIntentId = paymentIntent.id;
  order.stripePaymentIntentStatus = paymentIntent.status;

  const result = await gs.dba.collection("orders").insertOne(order);
  const id = result.insertedId;

  res.send({
    orderId: id,
    clientSecret: paymentIntent.client_secret,
  });
}
