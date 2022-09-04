import GongoServer from "gongo-server/lib/serverless";
import MongoDBA from "gongo-server-db-mongo";
// import { ObjectId } from "gongo-server-db-mongo";

const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1";

const gs = new GongoServer({
  dba: new MongoDBA(MONGO_URL, "sd-mui"),
});

const db = gs.dba;

// gs.db.Users.ensureAdmin("dragon@wastelands.net", "initialPassword");

gs.publish("accounts", (db) => db.collection("accounts").find());

gs.publish("user", async (db, _opts, { auth, updatedAt }) => {
  const userId = await auth.userId();
  if (!userId) return [];

  const fullUser = await db.collection("users").findOne({ _id: userId });
  if (!fullUser || fullUser.__updatedAt === updatedAt.users) return [];

  const user = { ...fullUser };
  delete user.services;
  delete user.password;

  return [
    {
      coll: "users",
      entries: [user],
    },
  ];
});

gs.publish("usersAndCredits", async (db, _opts, { auth /*, updatedAt */ }) => {
  const userId = await auth.userId();
  if (!userId) return [];

  const user = await db.collection("users").findOne({ _id: userId });
  if (!user || !user.admin) return [];

  const realUsers = await db.collection("users").getReal();
  const users = await realUsers
    .find(
      { _id: { $ne: userId } },
      {
        projection: {
          _id: true,
          emails: true,
          displayName: true,
          credits: true,
          admin: true,
        },
      }
    )
    .toArray();

  return [
    {
      coll: "users",
      entries: users,
    },
  ];
});

if (db) {
  /*
  db.collection("users").on("preInsertMany", async (props, args) => {
    return;
    /*
    const userId = props.auth.userId;
    const user = await props.dba.collection("users").findOne(userId);
    */
  /*
  });
  */
}

module.exports = gs.expressPost();
