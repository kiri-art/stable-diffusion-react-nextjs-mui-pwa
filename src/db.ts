import db from "gongo-client";
import HTTPTransport from "gongo-client/lib/transports/http";

import { Collection } from "gongo-client";
import GongoAuth from "gongo-client/lib/auth";

import type { User, Order, CreditCode } from "./schemas";

// const out = { db };

db.extend("auth", GongoAuth);
db.extend("transport", HTTPTransport, {
  pollInterval: 5 * 1000,
  pollWhenIdle: false,
  idleTimeout: 60 * 1000,
});

db.subscribe("user", {}, { minInterval: 10_000, maxInterval: 60_000 });
// db.subscribe("user", {}, { minInterval: 1000000, maxInterval: 300000000 });

if (typeof window !== "undefined")
  setTimeout(() => {
    // TODO disable in gongo-client?
    // Disabled here since we can subscribe just when Login() component active
    const accounts = db.subscriptions.get('["accounts"]');
    if (accounts) accounts.active = false;
  }, 5000);

db.collection("users").persist();
db.collection("orders").persist();
db.collection("creditCodes").persist();

declare module "gongo-client" {
  class Database {
    collection(name: "users"): Collection<User>;
    collection(name: "orders"): Collection<Order>;
    collection(name: "creditCodes"): Collection<CreditCode>;
  }
}

if (typeof window !== "undefined")
  // @ts-expect-error: it's fine
  window.db = db;
