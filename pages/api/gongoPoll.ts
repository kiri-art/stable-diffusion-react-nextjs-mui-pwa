import gs, { CreditCode, ObjectId, User } from "../../src/api-lib/db";
import {
  CollectionEventProps,
  userIsAdmin,
  userIdMatches,
} from "gongo-server-db-mongo/lib/collection";
import { ChangeSetUpdate } from "gongo-server/lib/DatabaseAdapter";
import { NUM_REPORTS_UNTIL_REMOVAL } from "../../src/lib/constants";

// gs.db.Users.ensureAdmin("dragon@wastelands.net", "initialPassword");

gs.publish("accounts", (db) => db.collection("accounts").find());

gs.publish("orders", async (db, {}, { auth }) => {
  const userId = await auth.userId();
  if (!userId) return [];
  return db.collection("orders").find({ userId });
});

gs.publish("statsDaily", async (db) => {
  return db.collection("statsDaily").find();
});

gs.publish("statsHourly", async (db) => {
  return db.collection("statsHourly").find();
});

gs.publish("csends", async (db) => {
  /*
  const userId = await auth.userId();
  if (!userId) return [];

  const user = await db.collection("users").findOne({ _id: userId });
  if (!user || !user.admin) return [];
  */

  return db
    .collection("csends")
    .find({ date: { $gt: new Date(Date.now() - 86400000 * 2) } })
    .sort("__updatedAt", "asc")
    .limit(200);
});

gs.publish("bananaRequests", async (db) => {
  return db
    .collection("bananaRequests")
    .find({ createdAt: { $gt: new Date(Date.now() - 86400000 * 2) } })
    .sort("__updatedAt", "asc")
    .limit(200);
});

gs.publish("star", async (db, { starId } = {}, { updatedAt }) => {
  const query: Record<string, unknown> = {};
  // if (!starId) throw new Error("no starId given");
  if (!starId) return [];

  if (starId) query._id = new ObjectId(starId);
  if (updatedAt.stars) query.__updatedAt = { $gt: updatedAt.stars };

  const star = await db.collection("stars").findOne(query);
  if (!star) return [];

  const upQuery: Record<string, unknown> = { _id: star.userId };
  if (updatedAt.userProfiles)
    upQuery.userProfiles = { $gt: updatedAt.userProfiles };

  const userProfiles = await (await db.collection("users").getReal())
    .find(upQuery)
    .project({ username: 1 })
    .limit(1)
    .toArray();
  console.log(userProfiles);

  return [
    { coll: "stars", entries: [star] },
    { coll: "userProfiles", entries: userProfiles },
  ];
});

gs.publish("stars", async (db, { userId, username } = {}, { updatedAt }) => {
  const query: Record<string, unknown> = {};
  if (username && !userId) {
    const user = await db.collection("users").findOne({ username });
    if (!user) return [];
    query.userId = user._id;
  } else if (userId) query.userId = new ObjectId(userId);
  if (updatedAt.stars) query.__updatedAt = { $gt: updatedAt.stars };

  const stars = await db.collection("stars").find(query).limit(200).toArray();

  const upQuery: Record<string, unknown> = {};
  if (updatedAt.userProfiles)
    upQuery.userProfiles = { $gt: updatedAt.userProfiles };

  const uids = Array.from(new Set(stars.map((s) => s.userId)));
  // if (profile with no stars), still return userProfile
  if (query.userId && uids.length === 0) uids.push(query.userId);
  upQuery._id = { $in: uids };

  const userProfiles = await (await db.collection("users").getReal())
    .find(upQuery)
    .project({ username: 1 })
    .toArray();

  if (stars.length || userProfiles.length)
    return [
      { coll: "stars", entries: stars },
      { coll: "userProfiles", entries: userProfiles },
    ];
  else return [];
});

/*
gs.publish("order", async (db, { orderId }, { auth, updatedAt }) => {
  const userId = await auth.userId();
  if (!userId) return [];

  const order = await db
    .collection("orders")
    .findOne({ _id: new ObjectId(orderId) });

  if (!order || order.__updatedAt === updatedAt.orders) return [];

  if (!order.userId.equals(userId)) {
    console.error(
      `Non-matching order userId ${order.userId} user userId ${userId}`
    );
    return [];
  }

  return [
    {
      coll: "orders",
      entries: [order],
    },
  ];
});
*/

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

gs.method("setUserName", async (db, { username }, { auth }) => {
  const userId = await auth.userId();
  if (!userId) throw new Error("Not logged in");

  const existing = await db.collection("users").findOne({ username });
  if (existing) return { status: "USERNAME_NOT_AVAILABLE" };

  await db
    .collection("users")
    .updateOne({ _id: userId }, { $set: { username } });
  return { status: "OK" };
});

gs.publish("allCreditCodes", async (db, _opts, { auth /*, updatedAt */ }) => {
  const userId = await auth.userId();
  if (!userId) return [];

  const user = await db.collection("users").findOne({ _id: userId });
  if (!user || !user.admin) return [];

  return db.collection("creditCodes").find();
});

gs.method("redeemCreditCode", async (db, { creditCode }, { auth }) => {
  const userId = await auth.userId();
  if (!userId) throw new Error("User not logged in");

  // TODO, projection
  const user = (await db
    .collection("users")
    .findOne({ _id: userId })) as unknown as User;

  if (user.redeemedCreditCodes && user.redeemedCreditCodes.includes(creditCode))
    return { $error: "ALREADY_REDEEMED" };

  // TODO, make atomic.  but honestly, who cares.
  const code = (await db
    .collection("creditCodes")
    .findOne({ name: creditCode })) as CreditCode | null;

  if (!code) return { $error: "NO_SUCH_CODE" };

  if (code.used >= code.total) return { $error: "MAXIMUM_REACHED" };

  await db.collection("users").updateOne(
    { _id: userId },
    {
      $inc: { "credits.free": code.credits },
      $push: { redeemedCreditCodes: creditCode },
    }
  );

  await db
    .collection("creditCodes")
    .updateOne({ _id: code._id }, { $inc: { used: 1 } });

  return { $success: true, credits: code.credits };
});

gs.publish("userLikes", async (db, _, { auth }) => {
  const userId = await auth.userId();
  if (!userId) return [];

  return db.collection("likes").find({ userId });
});

/*
gs.publish("userRequests", async (db, _opts, { auth, updatedAt }) => {
  const userId = await auth.userId();
  if (!userId) return [];

  const user = await db.collection("users").findOne({ _id: userId });
  if (!user || !user.admin) return [];

  return db.collection("userRequests").find();
});
*/

gs.publish("usersAndCredits", async (db, _opts, { auth, updatedAt }) => {
  const userId = await auth.userId();
  if (!userId) return [];

  const user = await db.collection("users").findOne({ _id: userId });
  if (!user || !user.admin) return [];

  const query = { _id: { $ne: userId } };
  if (updatedAt.users)
    // @ts-expect-error: i don't have time for you typescript
    query.__updatedAt = { $gt: updatedAt.users };

  const realUsers = await db.collection("users").getReal();
  const users = await realUsers
    .find(query, {
      projection: {
        _id: true,
        emails: true,
        displayName: true,
        credits: true,
        admin: true,
        __updatedAt: true,
      },
    })
    .toArray();

  return users.length
    ? [
        {
          coll: "users",
          entries: users,
        },
      ]
    : [];
});

gs.method(
  "reportStar",
  async (db, { starId: _starId }: { starId: string }, { auth }) => {
    const userId = await auth.userId();
    const starId = new ObjectId(_starId);

    const Reports = db.collection("reportedStars");
    const Stars = db.collection("stars");

    const star = await Stars.findOne({ _id: starId });
    if (!star) throw new Error("No such star");
    console.log(star);

    // const existingUserReport = await Reported.findOne({ userId, starId });

    const entry = {
      userId,
      starId,
      date: new Date(),
    };
    console.log(entry);
    await Reports.insertOne(entry);
    await Stars.updateOne({ _id: starId }, { $inc: { reports: 1 } });

    if (star.reports >= NUM_REPORTS_UNTIL_REMOVAL - 1) {
      // Maybe in the future we'll do something,
      // for now we just rely on `reports` count.
    }

    return { status: "OK", NUM_REPORTS: star.reports ? star.reports + 1 : 1 };
  }
);

if (gs.dba) {
  const db = gs.dba;

  const users = db.collection("users");
  users.allow(
    "update",
    async (
      doc: Document | ChangeSetUpdate | string,
      eventProps: CollectionEventProps
    ) => {
      const isAdmin = await userIsAdmin(doc, eventProps);
      if (isAdmin === true) return true;

      if (typeof doc === "object" && "patch" in doc) {
        if (doc.patch.length === 1) {
          if (doc.patch[0].path === "/dob") {
            // Ok for now
            return true;
          }
        }
      }

      return "ACCESS_DENIED";
    }
  );

  const creditCodes = db.collection("creditCodes");
  creditCodes.allow("insert", userIsAdmin);
  creditCodes.allow("update", userIsAdmin);
  creditCodes.allow("remove", userIsAdmin);

  const stars = db.collection("stars");
  stars.allow("update", userIdMatches);

  const likes = db.collection("likes");
  likes.allow("insert", userIdMatches);
  likes.allow("update", userIdMatches);

  // @ts-expect-error: gongo
  likes.on("postInsertMany", async (props, { entries }) => {
    // TODO, remove "as Document[]" when we complete gongo typesafety
    for (const doc of entries as Document[]) {
      console.log(doc);
      await db.collection("stars").updateOne(
        // @ts-expect-error: TODO
        { _id: doc.starId },
        { $inc: { likes: 1 } }
      );
    }
  });

  // @ts-expect-error: gongo
  likes.on("postUpdateMany", async (props, { entries }) => {
    for (const update of entries as ChangeSetUpdate[]) {
      console.log(update);
      const likeId = update._id;
      const like = await db.collection("likes").findOne({ _id: likeId });
      if (!like) return;
      await db
        .collection("stars")
        .updateOne(
          { _id: like.starId },
          { $inc: { likes: like.liked ? 1 : -1 } }
        );
    }
  });
}

module.exports = gs.expressPost();
