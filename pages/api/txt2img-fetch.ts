import fs from "node:fs";
import * as banana from "@banana-dev/banana-dev";
import type { NextApiRequest, NextApiResponse } from "next";
import txt2imgOptsSchema from "../../src/schemas/txt2imgOpts";

const apiKey = process.env.BANANA_API_KEY;
const modelKey = process.env.BANANA_MODEL_KEY;

export default async function txt2imgFetch(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (typeof apiKey !== "string")
    throw new Error("process.env.BANANA_API_KEY is not a string");
  if (typeof modelKey !== "string")
    throw new Error("process.env.BANANA_MODEL_KEY is not a string");

  const opts = req.query;
  const modelOpts = txt2imgOptsSchema.cast(opts);

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
  */
  /*
    modelOutputs: [ { message: "No prompt provided" } ]
  */

  console.log(req.query);
  console.log("sending", modelOpts);

  const out = await banana.run(apiKey, modelKey, modelOpts);
  // fs.writeFileSync("out.json", JSON.stringify(out));
  // console.log(out);
  // const out = JSON.parse(fs.readFileSync("out.json").toString("utf-8"));

  res.status(200).json(out);
}
