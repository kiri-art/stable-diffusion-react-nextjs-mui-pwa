// import * as banana from "@banana-dev/banana-dev";
import type { NextApiRequest, NextApiResponse } from "next";
import { addDays, endOfDay, startOfDay } from "date-fns";

import gs from "../../src/api-lib/db";

const db = gs.dba;

export default async function buildStats(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // const day = req.query.day;
  // if (typeof day !== "string") return res.status(500).end("Invalid 'date' arg");

  const range = [];
  const now = new Date();

  for (
    let date = addDays(new Date().setHours(0, 0, 0, 0), -1);
    date <= now;
    date = addDays(date, 1)
  ) {
    range.push(date);
  }
  console.log(range);

  if (!db) return res.status(500).end();
  const users = await db.collection("users").getReal();
  const requests = await db.collection("bananaRequests").getReal();
  const statsDaily = await db.collection("statsDaily").getReal();

  const models = await requests.distinct("callInputs.MODEL_ID");

  for (const date of range) {
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const realUserRequests = await db.collection("userRequests").getReal();
    let requestsByUser = (
      await realUserRequests
        .aggregate([
          { $match: { date: { $gt: dayStart, $lt: dayEnd } } },
          { $group: { _id: "$userId", requests: { $sum: 1 } } },
          { $project: { userId: "$_id", _id: 0, requests: 1 } },
        ])
        .toArray()
    ).sort((a, b) => b.requests - a.requests);

    const CUTOFF = 10;
    if (requestsByUser.length > CUTOFF) {
      const requestByUserCutoff = new Array(CUTOFF + 1);
      const other = (requestByUserCutoff[CUTOFF] = {
        requests: 0,
        userId: "other",
      });
      for (let i = 0; i < requestsByUser.length; i++) {
        if (i < CUTOFF) requestByUserCutoff[i] = requestsByUser[i];
        else other.requests += requestsByUser[i].requests;
      }
      requestsByUser = requestByUserCutoff;
    }

    // TODO, aggregation pipeline, accumulate previous days totals
    const dayStats = {
      date,
      newUsers: await users.countDocuments({
        createdAt: { $gt: dayStart, $lt: dayEnd },
      }),
      totalUsers: await users.countDocuments({ createdAt: { $lt: dayEnd } }),
      newRequests: await requests.countDocuments({
        createdAt: { $gt: dayStart, $lt: dayEnd },
      }),
      totalRequests: await requests.countDocuments({
        createdAt: { $lt: dayEnd },
      }),
      requestsByModel: await Promise.all(
        models.map(async (model) => ({
          model,
          requests: await requests.countDocuments({
            "callInputs.MODEL_ID": model,
            createdAt: { $gt: dayStart, $lt: dayEnd },
          }),
        }))
      ),
      requestsByUser,
      __updatedAt: Date.now(),
    };

    await statsDaily.replaceOne({ date }, dayStats, { upsert: true });
  }

  res.status(200).end("OK");
}
