import type { NextApiRequest, NextApiResponse } from "next";
import GongoServer from "gongo-server/lib/serverless";
import Database /* ObjectID */ from "gongo-server-db-mongo";
import crypto from "crypto";
import { CSend, BananaRequest } from "../../src/schemas";

const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1";

const gs = new GongoServer({
  dba: new Database(MONGO_URL, "sd-mui"),
});

const csends = gs.dba && gs.dba.collection("csends");
const bananaRequests = gs.dba && gs.dba.collection("bananaRequests");

async function aggregateRequestCsends(inferDone: CSend) {
  if (!(csends && bananaRequests)) return;

  const { container_id } = inferDone;

  const initStart = await csends.findOne({
    container_id,
    type: "init",
    status: "start",
  });
  const initDone = await csends.findOne({
    container_id,
    type: "init",
    status: "done",
  });
  const inferStart = (
    await (
      await csends.getReal()
    )
      .find({
        container_id,
        type: "inference",
        status: "start",
      })
      .sort({ date: -1 })
      .limit(1)
      .toArray()
  )[0];

  if (!(initStart && inferStart && initDone)) {
    console.warn("Missing", { initStart, inferStart, initDone });
    return;
  }

  // assume first inference for now... TODO...
  const query = { startRequestId: inferStart.payload.startRequestId };
  const bananaRequest = (await bananaRequests.findOne(
    query
  )) as BananaRequest | null;

  if (bananaRequest) {
    const loadTime =
      initStart.date.getTime() - bananaRequest.createdAt.getTime();
    const update = {
      $set: {
        times: {
          load: loadTime > 0 ? loadTime : null,
          init: loadTime > 0 ? initDone.tsl : null,
          inference: inferDone.tsl,
        },
      },
    };
    // console.log(query, update);
    await bananaRequests.updateOne(query, update);
  }
}

export default async function CSendRequest(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // TODO, remove.
  if (req.method === "GET" && req.query.type === "rebuild" && csends) {
    const events: CSend[] = (await csends
      .find({ type: "inference", status: "done" })
      .toArray()) as unknown as CSend[];
    for (const event of events) await aggregateRequestCsends(event);
    return res.status(200).end("OK");
  }

  if (req.method !== "POST") return res.status(400).end("expected a POST");
  if (typeof req.body !== "object")
    return res.status(400).end("body not decoded");

  const data = req.body;

  const containerSig = data.sig as string;
  delete data.sig;
  const ourSig = crypto
    .createHash("md5")
    .update(JSON.stringify(data) + process.env.SIGN_KEY)
    .digest("hex");
  const match = containerSig === ourSig;

  if (!match) return res.status(200).end("OK");

  data.date = new Date(data.time);
  delete data.time;

  console.log(JSON.stringify(data, null, 2));
  csends && (await csends.insertOne(data));

  if (data.type === "inference" && data.status === "done") {
    if (!(csends && bananaRequests))
      throw new Error("No csends / bananaRequests collections");
    await aggregateRequestCsends(data);
  }

  /*

  const { callID, step } = req.body;
  if (!callID) throw new Error("No callID provided");
  if (!step) throw new Error("No callID provided");

  const date = step.date ? new Date(step.date * 1000) : new Date();
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

    let finishedTime;
    if (typeof step.date === "number") finishedTime = new Date(step.date);
    else if (typeof step.date === "string") finishedTime = new Date(step.date);
    else finishedTime = new Date();

    // @ts-expect-error: TODO
    $set.finishedTime = finishedTime;
    // @ts-expect-error: TODO
    $set.totalTime = finishedTime - existing.createdAt;
  }

  console.log(update);

  if (gs.dba)
    await gs.dba.collection("bananaRequests").updateOne({ callID }, update);

  */

  res.status(200).end("OK");
}
