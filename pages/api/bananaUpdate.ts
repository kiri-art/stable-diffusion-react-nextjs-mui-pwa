import type { NextApiRequest, NextApiResponse } from "next";
import GongoServer from "gongo-server/lib/serverless";
import Database /* ObjectID */ from "gongo-server-db-mongo";

const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1";

const gs = new GongoServer({
  dba: new Database(MONGO_URL, "sd-mui"),
});

export default async function bananaUpdate(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") throw new Error("expected a POST");
  if (typeof req.body !== "object") throw new Error("Body not decoded");

  const { callID, step } = req.body;
  if (!callID) throw new Error("No callID provided");
  if (!step) throw new Error("No callID provided");

  // Try use client time if it seems reasonable, otherwise use our time.
  const date = (function () {
    let date;
    if (typeof step.date === "number" || typeof step.date === "string") {
      const now = new Date();
      date = new Date(step.date);
      if (isNaN(date.getTime())) return now;

      // Disallow dates in the future
      if (date.getTime() > now.getTime()) return now;

      // Only allow dates in the past 5 seconds
      if (now.getTime() - date.getTime() > 5_000) return now;

      return date;
    }
    return new Date();
  })();

  const $set = { ["steps." + step.name]: { date, value: step.value } };
  const update = { $set };

  if (step.name === "finished") {
    console.log({ callID });
    const existing = await (gs.dba &&
      gs.dba.collection("bananaRequests").findOne({ callID }));
    console.log(existing);
    if (!existing) return res.status(200).end("OK");

    // @ts-expect-error: TODO
    $set.finished = true;

    /*
    let finishedTime;
    if (typeof step.date === "number") finishedTime = new Date(step.date);
    else if (typeof step.date === "string") finishedTime = new Date(step.date);
    else finishedTime = new Date();
    */

    // @ts-expect-error: TODO
    $set.finishedTime = date;
    // @ts-expect-error: TODO
    $set.totalTime = finishedTime - existing.createdAt;
  }

  console.log(update);

  if (gs.dba)
    await gs.dba.collection("bananaRequests").updateOne({ callID }, update);

  res.status(200).end("OK");
}
