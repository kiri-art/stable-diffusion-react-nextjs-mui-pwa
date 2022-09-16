import * as banana from "@banana-dev/banana-dev";
import type { NextApiRequest, NextApiResponse } from "next";
import Auth from "gongo-server/lib/auth-class";
import GongoServer from "gongo-server/lib/serverless";
import Database /* ObjectID */ from "gongo-server-db-mongo";

import type { Txt2ImgOpts } from "../../src/schemas/txt2imgOpts";
import txt2imgOptsSchema from "../../src/schemas/txt2imgOpts";
import { REQUIRE_REGISTRATION } from "../../src/lib/server-env";

const apiKey = process.env.BANANA_API_KEY;

const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1";

const gs = new GongoServer({
  dba: new Database(MONGO_URL, "sd-mui"),
});

async function bananaSdkRun(modelOpts: Txt2ImgOpts, MODEL_NAME: string) {
  if (typeof apiKey !== "string")
    throw new Error("process.env.BANANA_API_KEY is not a string");

  let envName = "BANANA_MODEL_KEY";
  if (MODEL_NAME) envName += "_" + MODEL_NAME;

  switch (modelOpts.MODEL_ID) {
    case "hakurei/waifu-diffusion":
      envName += "_WAIFU";
      break;
    case "rinnakk/japanese-stable-diffusion":
      envName += "_JP";
      break;
  }

  const modelKey = process.env[envName];

  console.log({
    var: envName,
    key: modelKey,
  });

  if (typeof modelKey !== "string")
    throw new Error(`${envName} is not a string`);

  /*
    {
      id: '236f1501-d363-4a8d-adcc-71e036126741',
      message: 'success',
      created: 1661936807,
      apiVersion: '28 July 2022',
      modelOutputs: [
        {
          image_base64: '/9j/4AAQSkZ....'
        }
      ]
    }
  */
  /*
    message: '',
    modelOutputs: [ { message: "No prompt provided" } ]
  */

  const out = await banana.run(apiKey, modelKey, modelOpts);
  // fs.writeFileSync("out.json", JSON.stringify(out));
  // console.log(out);
  // const out = JSON.parse(fs.readFileSync("out.json").toString("utf-8"));

  return out;
}

async function localSdkRun(modelOpts: Txt2ImgOpts) {
  const created = Math.floor(Date.now() / 1000);

  const response = await fetch("http://localhost:8000", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(modelOpts),
  });

  const data = await response.json();

  // Now we return it in the same way Banana's SDK would
  return {
    id: "UID todo",
    // Up until now, every { message: "something" } has been a failure.
    message: data.message ? "" : "success",
    created,
    apiVersion: "local dev",
    modelOutputs: [data],
  };
}

const runners = {
  "banana-local": localSdkRun,
  "banana-remote": bananaSdkRun,
};

const shorten = (str: string) =>
  str.substring(0, 5) + "...[snip]..." + str.substring(str.length - 5);

function log(out: Record<string, unknown>) {
  console.log(
    JSON.stringify(
      out,
      function replacer(key, value) {
        if (key.endsWith("_image") || key.startsWith("image_"))
          return shorten(value);
        return value;
      },
      2
    )
  );
}

export default async function txt2imgFetch(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") throw new Error("expected a POST");
  if (typeof req.body !== "object") throw new Error("Body not decoded");
  if (!req.body.modelOpts) throw new Error("No modelOpts provided");

  const modelOpts = txt2imgOptsSchema.cast(req.body.modelOpts);
  const fetchOpts = req.body.fetchOpts || {};

  console.log(fetchOpts);

  let credits;
  if (REQUIRE_REGISTRATION) {
    if (!fetchOpts.auth) return res.status(400).end("Forbidden");
    if (!gs.dba) throw new Error("gs.dba not defined");

    const auth = new Auth(gs.dba, fetchOpts.auth);
    const userId = await auth.userId();

    if (!userId) {
      return res.status(403).send("Forbidden");
    }

    const user = await gs.dba.collection("users").findOne({ _id: userId });
    if (!user) return res.status(500).send("Server error");

    if (!(user.credits.free > 0 || user.credits.paid > 0))
      return res.status(403).send("Out of credits");

    if (user.credits.free) {
      user.credits.free--;
      await gs.dba
        .collection("users")
        .updateOne({ _id: userId }, { $inc: { "credits.free": -1 } });
    } else {
      user.credits.paid--;
      await gs.dba
        .collection("users")
        .updateOne({ _id: userId }, { $inc: { "credits.paid": -1 } });
    }

    credits = user.credits;
  }

  log(modelOpts);

  // @ts-expect-error: TODO
  const runner = runners[fetchOpts.dest];

  const out = await runner(modelOpts, fetchOpts.MODEL_NAME);
  if (REQUIRE_REGISTRATION) out.credits = credits;

  log(out);

  res.status(200).json(out);
}
