import type { ObjectId } from "bson";
import type { Collection } from "gongo-server-db-mongo";
import type { EnhancedOmit } from "gongo-server-db-mongo/lib/collection";
import type { User } from "../src/schemas";

type ServerCollection<T> = Collection<
  GongoDocuent & EnhancedOmit<T, "_id"> & { _id: ObjectId }
>;

declare module "gongo-server-db-mongo" {
  class MongoDatabaseAdapter {
    collection(name: "users"): ServerCollection<User>;
  }
}
