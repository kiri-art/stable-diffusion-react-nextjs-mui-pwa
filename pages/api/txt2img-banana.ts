import * as banana from "@banana-dev/banana-dev";
import type { NextApiRequest, NextApiResponse } from "next";
import type { Txt2ImgOpts } from "../../src/schemas/txt2imgOpts";
import txt2imgOptsSchema from "../../src/schemas/txt2imgOpts";

const apiKey = process.env.BANANA_API_KEY;
const modelKey = process.env.BANANA_MODEL_KEY;

async function bananaSdkRun(modelOpts: Txt2ImgOpts) {
  if (typeof apiKey !== "string")
    throw new Error("process.env.BANANA_API_KEY is not a string");
  if (typeof modelKey !== "string")
    throw new Error("process.env.BANANA_MODEL_KEY is not a string");

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

export default async function txt2imgFetch(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") throw new Error("expected a POST");
  console.log(req.body);
  if (typeof req.body !== "object") throw new Error("Body not decoded");
  if (!req.body.modelOpts) throw new Error("No modelOpts provided");

  const modelOpts = txt2imgOptsSchema.cast(req.body.modelOpts);
  const fetchOpts = req.body.fetchOpts || {};

  console.log("sending", modelOpts);

  // @ts-expect-error: TODO
  const runner = runners[fetchOpts.dest];

  const out = await runner(modelOpts);

  const toLog: object = { ...out };
  // @ts-expect-error: just some logging `:)
  toLog.modelOutputs = toLog.modelOutputs.map((output) => {
    if (output.image_base64)
      return {
        ...output,
        image_base64:
          output.image_base64.substr(0, 5) +
          "...[snip]..." +
          output.image_base64.substr(output.image_base64.length - 5),
      };
    return output;
  });

  console.log(toLog);

  res.status(200).json(out);
}
