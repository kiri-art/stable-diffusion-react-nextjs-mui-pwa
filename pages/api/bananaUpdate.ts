import type { NextApiRequest, NextApiResponse } from "next";
import gs from "../../src/api-lib/db-full";

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

  const $set: {
    [key: string]:
      | { date: Date; value: number }
      | boolean
      | Date
      | number
      | undefined;
    finished?: boolean;
    finishedTime?: Date;
    totalTime?: number;
  } = { ["steps." + step.name]: { date, value: step.value } };
  const update = { $set };

  if (step.name === "finished") {
    console.log({ callID });
    const existing = await (gs.dba &&
      gs.dba.collection("bananaRequests").findOne({ callID }));
    console.log(existing);
    if (!existing) return res.status(200).end("OK");

    $set.finished = true;
    $set.finishedTime = date;
    $set.totalTime = date.getTime() - existing.createdAt.getTime();
  }

  console.log(update);

  if (gs.dba)
    await gs.dba.collection("bananaRequests").updateOne({ callID }, update);

  res.status(200).end("OK");
}
