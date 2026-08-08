// import { ipFromReq, ipPass } from "../../src/api-lib/ipCheck";
import { ObjectId } from "bson";
import { addDays } from "date-fns";
import { ChangeSetUpdate } from "gongo-server/lib/DatabaseAdapter";
import {
  CollectionEventProps,
  GongoDocument,
  userIdMatches,
  userIsAdmin,
} from "gongo-server-db-mongo/lib/collection";
import { NextApiRequest, NextApiResponse } from "next";
import gs, { CreditCode, User } from "../../src/api-lib/db";
import { NUM_REPORTS_UNTIL_REMOVAL } from "../../src/config/constants";
import {
  type AccountWriteLease,
  acquireAccountWriteLease,
  withAccountWriteLease,
} from "../../src/server/account-data/writeBarrier";

export const config = {
  runtime: "edge",
  // regions: ['iad1'],
};

// gs.db.Users.ensureAdmin("dragon@wastelands.net", "initialPassword");
gs.publish("accounts", (db) =>
  db.collection("accounts").find({ userId: { $exists: false } }),
);

gs.publish("orders", async (db, {}, { auth }) => {
  const userId = await auth.userId();
  if (!userId) return [];
  return db.collection("orders").find({ userId });
});

gs.publish("statsDaily", async (db) => {
  const date = addDays(new Date().setHours(0, 0, 0, 0), -14);
  return db.collection("statsDaily").find({ date: { $gt: date } });
});

gs.publish("statsHourly", async (db) => {
  const date = addDays(new Date(), -1);
  return db.collection("statsHourly").find({ date: { $gt: date } });
});

gs.publish("csends", async (db) => {
  /*
  const userId = await auth.userId();
  if (!userId) return [];

  const user = await db.collection("users").findOne({ _id: userId });
  if (!user || !user.admin) return [];
  */

  return db.collection("csends").find();
  //  .find({ date: { $gt: new Date(Date.now() - 86400000 * 2) } });
  // .sort("__updatedAt", "asc")
  // .limit(200);
});

gs.publish("bananaRequests", async (db) => {
  return (
    db
      .collection("bananaRequests")
      .find()
      // .find({ createdAt: { $gt: new Date(Date.now() - 86400000 * 2) } })
      // .sort("__updatedAt", "asc")
      .project({
        "modelInputs.image": 0,
        "modelInputs.init_image": 0,
        "modelInputs.mask_image": 0,
        "modelInputs.input_image": 0,
      })
  );
  // .limit(200);
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
  if (updatedAt.userProfiles) {
    upQuery.userProfiles = { $gt: updatedAt.userProfiles };
  }

  const userProfiles = await (await db.collection("users").getReal())
    .find(upQuery)
    .project({ username: 1 })
    .limit(1)
    .toArray();
  return [
    { coll: "stars", entries: [star] },
    { coll: "userProfiles", entries: userProfiles },
  ];
});

gs.publish(
  "stars",
  async (
    db,
    { userId, username, nsfw = false } = {},
    { updatedAt, limit, sort, lastSortedValue },
  ) => {
    const query: Record<string, unknown> = {};
    if (username && !userId) {
      const user = await db.collection("users").findOne({ username });
      if (!user) return [];
      query.userId = user._id;
    } else if (userId) query.userId = new ObjectId(userId);

    if (nsfw) query["callInputs.safety_checker"] = false;
    else {
      query.$or = [
        { "callInputs.safety_checker": true },
        { "callInputs.safety_checker": { $exists: false } },
        { "callInputs.safety_checker": null },
      ];
    }

    if (updatedAt && updatedAt.stars) {
      query.__updatedAt = { $gt: updatedAt.stars };
    } else {
      if (lastSortedValue) {
        if (!sort) throw new Error("lastSortedValue requires sort");
        query[sort[0]] = {
          [sort[1] === "asc" ? "$gt" : "$lt"]: lastSortedValue,
        };
      }
    }

    const cursor = db.collection("stars").find(query);

    if (updatedAt && updatedAt.stars) {
      cursor.sort("__updatedAt", "asc");
      cursor.limit(200);
    } else {
      if (sort) cursor.sort(sort[0], sort[1]);
      if (limit) cursor.limit(limit);
    }

    const stars = await cursor.toArray();

    const upQuery: Record<string, unknown> = {};
    if (updatedAt && updatedAt.userProfiles) {
      upQuery.userProfiles = { $gt: updatedAt.userProfiles };
    }

    const uids = Array.from(new Set(stars.map((s) => s.userId)));
    // if (profile with no stars), still return userProfile
    if (query.userId && uids.length === 0) uids.push(query.userId);
    upQuery._id = { $in: uids };

    const userProfiles = await (await db.collection("users").getReal())
      .find(upQuery)
      .project({ username: 1 })
      .toArray();

    if (stars.length || userProfiles.length) {
      return [
        { coll: "stars", entries: stars },
        { coll: "userProfiles", entries: userProfiles },
      ];
    } else return [];
  },
);

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

  return withAccountWriteLease(
    {
      db: await gs.dba!.dbPromise,
      operation: "set-username",
      targetUserId: userId,
    },
    async () => {
      const existing = await db.collection("users").findOne({ username });
      if (existing) return { status: "USERNAME_NOT_AVAILABLE" };

      await db
        .collection("users")
        .updateOne({ _id: userId }, { $set: { username } });
      return { status: "OK" };
    },
  );
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

  return withAccountWriteLease(
    {
      db: await gs.dba!.dbPromise,
      operation: "redeem-credit-code",
      targetUserId: userId,
    },
    async () => {
      // TODO, projection
      const user = (await db
        .collection("users")
        .findOne({ _id: userId })) as unknown as User;

      if (
        user.redeemedCreditCodes &&
        user.redeemedCreditCodes.includes(creditCode)
      ) {
        return { $error: "ALREADY_REDEEMED" };
      }

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
        },
      );

      await db
        .collection("creditCodes")
        .updateOne({ _id: code._id }, { $inc: { used: 1 } });

      return { $success: true, credits: code.credits };
    },
  );
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

gs.publish("usersAndCredits", async (db, _opts, { auth }) => {
  const userId = await auth.userId();
  if (!userId) return [];

  const user = await db.collection("users").findOne({ _id: userId });
  if (!user || !user.admin) return [];

  const query = { _id: { $ne: userId } };

  return await db.collection("users").find(query).project({
    _id: true,
    emails: true,
    username: true,
    displayName: true,
    credits: true,
    admin: true,
    createdAt: true,
    __updatedAt: true,
  });
});

gs.method(
  "reportStar",
  async (db, { starId: _starId }: { starId: string }, { auth }) => {
    const userId = await auth.userId();
    if (!userId) throw new Error("User not logged in");
    const starId = new ObjectId(_starId);

    return withAccountWriteLease(
      {
        db: await gs.dba!.dbPromise,
        operation: "report-star",
        targetUserId: userId,
      },
      async () => {
        const Reports = db.collection("reportedStars");
        const Stars = db.collection("stars");

        const star = await Stars.findOne({ _id: starId });
        if (!star) throw new Error("No such star");
        // const existingUserReport = await Reported.findOne({ userId, starId });

        const entry = {
          userId,
          starId,
          date: new Date(),
        };
        await Reports.insertOne(entry);
        await Stars.updateOne({ _id: starId }, { $inc: { reports: 1 } });

        if (star.reports >= NUM_REPORTS_UNTIL_REMOVAL - 1) {
          // Maybe in the future we'll do something,
          // for now we just rely on `reports` count.
        }

        return {
          status: "OK",
          NUM_REPORTS: star.reports ? star.reports + 1 : 1,
        };
      },
    );
  },
);

async function userIdMatchesWritable(
  doc: GongoDocument | ChangeSetUpdate | string,
  eventProps: CollectionEventProps,
) {
  const matches = await userIdMatches(doc, eventProps);
  if (matches !== true) return matches;
  const userId = await eventProps.auth.userId();
  if (!userId) return "NOT_LOGGED_IN";
  await acquireGongoWriteLease(eventProps, userId, "gongo-account-write");
  return true;
}

const gongoWriteLeases = new WeakMap<object, AccountWriteLease[]>();

async function acquireGongoWriteLease(
  eventProps: CollectionEventProps,
  targetUserId: ObjectId | string,
  operation: string,
) {
  const lease = await acquireAccountWriteLease({
    db: await gs.dba!.dbPromise,
    operation,
    targetUserId,
  });
  const key = eventProps.auth as object;
  const leases = gongoWriteLeases.get(key) || [];
  leases.push(lease);
  gongoWriteLeases.set(key, leases);
}

async function releaseGongoWriteLeases(eventProps: CollectionEventProps) {
  const key = eventProps.auth as object;
  const leases = gongoWriteLeases.get(key) || [];
  gongoWriteLeases.delete(key);
  await Promise.all(leases.map((lease) => lease.release()));
}

if (gs.dba) {
  const db = gs.dba;

  const users = db.collection("users");
  users.allow(
    "update",
    async (
      doc: GongoDocument | ChangeSetUpdate | string,
      eventProps: CollectionEventProps,
    ) => {
      const actorUserId = await eventProps.auth.userId();
      if (!actorUserId) return "NOT_LOGGED_IN";

      const isAdmin = await userIsAdmin(doc, eventProps);
      if (isAdmin === true) {
        await acquireGongoWriteLease(
          eventProps,
          actorUserId,
          "gongo-user-update",
        );
        return true;
      }

      if (typeof doc === "object" && "patch" in doc) {
        if (doc.patch.length === 1) {
          if (doc.patch[0].path === "/dob") {
            // Ok for now
            await acquireGongoWriteLease(
              eventProps,
              actorUserId,
              "gongo-user-update",
            );
            return true;
          }
        }
      }

      return "ACCESS_DENIED";
    },
  );
  users.on("postUpdateMany", async (props) => {
    await releaseGongoWriteLeases(props);
  });

  const creditCodes = db.collection("creditCodes");
  creditCodes.allow("insert", userIsAdmin);
  creditCodes.allow("update", userIsAdmin);
  creditCodes.allow("remove", userIsAdmin);

  const stars = db.collection("stars");
  stars.allow("update", userIdMatchesWritable);

  const likes = db.collection("likes");
  likes.allow("insert", userIdMatchesWritable);
  likes.allow("update", userIdMatchesWritable);

  // @ts-expect-error: gongo
  likes.on("postInsertMany", async (props, { entries }) => {
    try {
      // TODO, remove "as Document[]" when we complete gongo typesafety
      for (const doc of entries as Document[]) {
        await db.collection("stars").updateOne(
          // @ts-expect-error: TODO
          { _id: doc.starId },
          { $inc: { likes: 1 } },
        );
      }
    } finally {
      await releaseGongoWriteLeases(props);
    }
  });

  // @ts-expect-error: gongo
  likes.on("postUpdateMany", async (props, { entries }) => {
    try {
      for (const update of entries as ChangeSetUpdate[]) {
        const likeId = update._id;
        const like = await db
          .collection("likes")
          .findOne({ _id: new ObjectId(likeId) });
        if (!like) return;
        await db
          .collection("stars")
          .updateOne(
            { _id: like.starId },
            { $inc: { likes: like.liked ? 1 : -1 } },
          );
      }
    } finally {
      await releaseGongoWriteLeases(props);
    }
  });

  stars.on("postUpdateMany", async (props) => {
    await releaseGongoWriteLeases(props);
  });
}

// module.exports = gs.expressPost();
const gsExpressPost =
  config.runtime === "edge" ? gs.vercelEdgePost() : gs.expressPost();
async function gongoPoll(req: NextApiRequest, res: NextApiResponse) {
  /*
  if (
    process.env.NODE_ENV === "production" &&
    !(await ipPass(ipFromReq(req)))
  ) {
    res.status(403).end("IP not allowed");
    return;
  }
  */

  // @ts-expect-error: TODO
  return gsExpressPost(req, res);
}

export default gongoPoll;
