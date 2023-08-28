import GongoServer from "gongo-server/lib/serverless";
import MongoDBA from "gongo-server-db-mongo";
import Auth from "gongo-server/lib/auth-class";
import Database /* Collection, */ /* ObjectId */ from "gongo-server-db-mongo";
import MongoClient from "mongodb-rest-relay/lib/client";

// Uh, "export { ObjectId }" from gongo-server-db-mongo not working?????
import { ObjectId } from "bson";
// console.log("db", ObjectId);

import type { User, Order, CreditCode } from "../../src/schemas";

// const env = process.env;
// const MONGO_URL = env.MONGO_URL || "mongodb://127.0.0.1";

const MONGO_URL =
  "http" +
  (process.env.NODE_ENV === "production"
    ? "s://kiri.art"
    : "://localhost:3000") +
  "/api/mongoRelay";

const gs = new GongoServer({
  // dba: new MongoDBA(MONGO_URL, "sd-mui"),
  // @ts-expect-error: ok
  dba: new MongoDBA(MONGO_URL, "sd-mui", MongoClient),
});

const db = gs.dba;
const dba = gs.dba;

/*
declare module "gongo-server" {
  class Database {
    collection(name: "users"): Collection<User>;
  }
}
*/

export { db, dba, Auth, Database, ObjectId, User, Order, CreditCode };
export default gs;
