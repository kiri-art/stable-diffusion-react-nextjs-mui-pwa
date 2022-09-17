// Currently unused, as not possible to set { longPoll: false }
// So not so useful to run serverless.
// Instead we'll run on the client and call bananaUpdate afterwards.

import type { NextApiRequest, NextApiResponse } from "next";
// import GongoServer from "gongo-server/lib/serverless";
// import Database /* ObjectID */ from "gongo-server-db-mongo";
import { v4 as uuidv4 } from "uuid";

// const apiKey = process.env.BANANA_API_KEY;
// const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1";

/*
const gs = new GongoServer({
  dba: new Database(MONGO_URL, "sd-mui"),
});
*/

export default async function bananaCheck(
  req: NextApiRequest,
  res: NextApiResponse
) {
  console.log(req.query);
  const callID = req.query.callID;

  const payload = {
    id: uuidv4(),
    created: Math.floor(Date.now() / 1000),
    longPoll: false, // <-- main reason we can't use banana-node-sdk
    callID: callID,
  };

  const start = Date.now();
  console.log("request");

  const response = await fetch("https://api.banana.dev/check/v4/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();

  let result;
  try {
    result = JSON.parse(text);
  } catch (error) {
    console.log(text);
    throw error;
  }
  console.log("result", Date.now() - start);

  console.log(result);

  res.status(200).json(result);
}
