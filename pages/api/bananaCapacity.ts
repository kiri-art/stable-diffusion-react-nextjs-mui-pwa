// import * as banana from "@banana-dev/banana-dev";
import type { NextApiRequest, NextApiResponse } from "next";

import gs from "../../src/api-lib/db";

const db = gs.dba;

export default async function buildStats(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!db) return res.status(500).end();

  const response = await fetch("https://app.banana.dev/api/capacity");
  const data = await response.json();
  console.log(data);

  const entry = {
    date: new Date(),
    ...data,
  };

  console.log(entry);

  await db.collection("bananaCapacity").insertOne(entry);

  res.status(200).end("OK");
}
