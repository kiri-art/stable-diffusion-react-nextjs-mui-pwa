import Stream, { TransformCallback } from "stream";
import { NextApiRequest, NextApiResponse } from "next";
import { WithId, Document } from "mongodb";
import JSZip from "jszip";

import gs from "../../src/api-lib/db-full";

class ToJSON extends Stream.Transform {
  sentFirst = false;
  last: WithId<Document> | null = null;

  constructor() {
    super({ objectMode: true });
  }

  _transform(
    data: WithId<Document>,
    encoding: BufferEncoding,
    callback: TransformCallback
  ) {
    if (!this.sentFirst) {
      callback(null, "[\n");
      this.sentFirst = true;
    }

    if (this.last) {
      callback(null, JSON.stringify(this.last, null, 2) + ",\n");
    }

    this.last = data;
  }

  _flush(callback: TransformCallback) {
    callback(null, JSON.stringify(this.last, null, 2) + "\n]\n");
  }
}

export default async function myData(
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

  res.writeHead(200, {
    "Content-Type": "application/zip",
    "Content-Disposition": `attachment; filename=kiri-${user._id}.zip`,
  });

  const zip = new JSZip();
  zip.file("users.json", JSON.stringify(user, null, 2));

  const collections = await db.collections();
  for (const collection of collections) {
    const name = collection.collectionName;
    if (name === "users") continue;

    const query = { userId: user._id };
    const exists = await collection.findOne(query);
    if (!exists) continue;

    zip.file(
      `${name}.json`,
      collection.find(query).stream().pipe(new ToJSON())
    );
  }

  zip.generateNodeStream({ streamFiles: true }).pipe(res);
}
