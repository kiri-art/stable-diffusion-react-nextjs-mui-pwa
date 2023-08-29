import GongoServer from "gongo-server/lib/serverless";
import MongoDBA from "gongo-server-db-mongo";
import Auth from "gongo-server/lib/auth-class";
import Database, { Collection /*, ObjectId */ } from "gongo-server-db-mongo";
import MongoClient from "mongodb-rest-relay/lib/client";
import { ObjectId } from "bson";

// Uh, "export { ObjectId }" from gongo-server-db-mongo not working?????
// import { ObjectId } from "bson";
// console.log("db", ObjectId);

import type {
  User as _User,
  Order,
  CreditCode as _CreditCode,
} from "../../src/schemas";

// Can't omit on type with index signature, have to remap.
// export type User = Omit<_User, "_id"> & { _id: ObjectId };
type FixClientSchema<T> = {
  [K in keyof T as K extends "_id" ? never : K]: T[K];
} & { _id: ObjectId };

type User = FixClientSchema<_User>;
type CreditCode = FixClientSchema<_CreditCode>;

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

declare module "gongo-server" {
  class Database {
    collection(name: "users"): Collection<User>;
  }
}

export type { User, Order, CreditCode };
export { db, dba, Auth, Database };
export default gs;
