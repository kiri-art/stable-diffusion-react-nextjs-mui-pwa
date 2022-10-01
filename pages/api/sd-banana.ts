// import * as banana from "@banana-dev/banana-dev";
import type { NextApiRequest, NextApiResponse } from "next";
import Auth from "gongo-server/lib/auth-class";
import GongoServer from "gongo-server/lib/serverless";
import Database /* ObjectID */ from "gongo-server-db-mongo";
import { v4 as uuidv4 } from "uuid";

import type { BananaRequest } from "../../src/schemas/bananaRequest";
import stableDiffusionInputsSchema from "../../src/schemas/stableDiffusionInputs";
import type { StableDiffusionInputs } from "../../src/schemas/stableDiffusionInputs";
import { REQUIRE_REGISTRATION } from "../../src/lib/server-env";
import bananaCallInputsSchema, {
  BananaCallInputs,
} from "../../src/schemas/bananaCallInputs";

const apiKey = process.env.BANANA_API_KEY;

const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1";

const gs = new GongoServer({
  dba: new Database(MONGO_URL, "sd-mui"),
});

async function bananaSdkRun(
  modelInputs: StableDiffusionInputs,
  callInputs: BananaCallInputs
) {
  if (typeof apiKey !== "string")
    throw new Error("process.env.BANANA_API_KEY is not a string");

  let envName = "BANANA_MODEL_KEY_SD";
  switch (callInputs.MODEL_ID) {
    case "hakurei/waifu-diffusion":
      envName += "_WAIFU";
      break;
    case "hakurei/waifu-diffusion-v1-3":
      envName += "_WAIFU_v1_3";
      break;
    case "rinna/japanese-stable-diffusion":
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

  // const out = await banana.run(apiKey, modelKey, modelOpts);
  // const id = await banana.start(apiKey, modelKey, modelOpts);

  const now = new Date();

  const startRequestId = uuidv4();

  const payload = {
    id: startRequestId,
    created: Math.floor(now.getTime() / 1000),
    apiKey,
    modelKey,
    modelInputs: { modelInputs, callInputs },
    startOnly: true,
  };

  callInputs.startRequestId = startRequestId;

  const response = await fetch("https://api.banana.dev/start/v4/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  // TODO, error handling `:)

  const result = await response.json();
  const callID = result.callID;

  // fs.writeFileSync("out.json", JSON.stringify(out));
  // console.log(out);
  // const out = JSON.parse(fs.readFileSync("out.json").toString("utf-8"));

  if (modelInputs.init_image) modelInputs.init_image = "[truncated]";
  if (modelInputs.mask_image) modelInputs.mask_image = "[truncated]";

  const bananaRequest: BananaRequest = {
    // bananaId: result.id,
    modelKey,
    callID,
    startRequestId,
    createdAt: now,
    apiVersion: result.apiVersion,
    message: result.message,
    finished: result.finished,
    modelInputs,
    callInputs,
    steps: {},
  };

  if (gs && gs.dba)
    await gs.dba.collection("bananaRequests").insertOne(bananaRequest);

  return result;
}

async function localSdkRun(
  modelInputs: StableDiffusionInputs,
  callInputs: BananaCallInputs
) {
  const created = Math.floor(Date.now() / 1000);

  const response = await fetch("http://localhost:8000", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ modelInputs, callInputs }),
    // body: JSON.stringify({ ...modelInputs, ...callInputs }), // for now
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
  if (!req.body.modelInputs) throw new Error("No modelInputs provided");

  const modelInputs = stableDiffusionInputsSchema.cast(req.body.modelInputs);
  const callInputs = bananaCallInputsSchema.cast(req.body.callInputs);
  const fetchOpts = req.body.fetchOpts || {};

  if (callInputs.MODEL_ID === "rinna/japanese-stable-diffusion")
    callInputs.PIPELINE = "Japanese" + callInputs.PIPELINE;

  log({ modelInputs, callInputs, fetchOpts });

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

  // Let's just be sure until we sort this properly

  // @ts-expect-error: doesn't exist, need to fix as above
  if (modelInputs.randomizeSeed) {
    // @ts-expect-error: doesn't exist, need to fix as above
    delete modelInputs.randomizeSeed;
    console.log("! Removed modelInputs.randomizeSeed - TODO");
  }
  // @ts-expect-error: doesn't exist, need to fix as above
  if (modelInputs.shareInputs) {
    // @ts-expect-error: doesn't exist, need to fix as above
    delete modelInputs.shareInputs;
    console.log("! Removed modelInputs.shareInputs - TODO");
  }

  // @ts-expect-error: TODO
  const runner = runners[fetchOpts.dest];

  const out = await runner(modelInputs, callInputs);
  if (REQUIRE_REGISTRATION) out.credits = credits;

  log(out);

  res.status(200).json(out);
}
