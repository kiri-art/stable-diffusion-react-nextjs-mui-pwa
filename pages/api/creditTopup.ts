// import * as banana from "@banana-dev/banana-dev";
import type { NextApiRequest, NextApiResponse } from "next";

import gs from "../../src/api-lib/db";

const DAILY_FREE_CREDITS = 20;

const db = gs.dba;

export default async function buildStats(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!db) return res.status(500).end();
  const users = await db.collection("users").getReal();

  if (req.query.API_KEY === process.env.API_KEY) {
    await users.updateMany(
      {
        "credits.free": { $lt: DAILY_FREE_CREDITS },
      },
      {
        $set: {
          "credits.free": DAILY_FREE_CREDITS,
          __updatedAt: Date.now(),
        },
      }
    );
  }

  res.status(200).end("OK");
}
