import db from "gongo-client";
import HTTPTransport from "gongo-client/lib/transports/http";

import { Collection } from "gongo-client";
import GongoAuth from "gongo-client/lib/auth";

import type { User } from "./schemas";

// const out = { db };

db.extend("auth", GongoAuth);
db.extend("transport", HTTPTransport, {
  pollInterval: 5 * 1000,
  pollWhenIdle: false,
  idleTimeout: 60 * 1000,
});

db.subscribe("user");
db.collection("users").persist();

declare module "gongo-client" {
  class Database {
    collection(name: "users"): Collection<User>;
  }
}

if (typeof window !== "undefined")
  // @ts-expect-error: it's fine
  window.db = db;
