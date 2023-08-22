import { NextApiRequest, NextApiResponse } from "next";

import gs from "../../src/api-lib/db";

export default async function myDataDelete(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { sessionId } = req.query;

  if (!gs.dba)
    return res
      .status(500)
      .send("Database not connected. Please try again later.");

  const db = await gs.dba.dbPromise;

  const session = await db.collection("sessions").findOne({ _id: sessionId });
  if (!session) return res.status(401).send("Session not found");

  const user = await db.collection("users").findOne({ _id: session.userId });
  if (!user) return res.status(500).send("User not found");

  const query = { userId: user._id };
  const updated = { __deleted: true, __updatedAt: Date.now() };

  await db.collection("users").updateOne({ _id: user._id }, updated);

  const collections = await db.collections();
  for (const collection of collections) {
    const name = collection.collectionName;
    if (name === "users") continue; // _id not userId

    await collection.updateMany(query, updated);
  }

  res.status(200).send("OK");
}
