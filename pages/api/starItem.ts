import type { NextApiRequest, NextApiResponse } from "next";
import sanitizeFilename from "sanitize-filename";

import type NodeCol from "../../src/schemas/lib/NodeCol";
import type Star from "../../src/schemas/star";
import sharedInputTextFromInputs from "../../src/lib/sharedInputTextFromInputs";
import {
  ddaCallInputsSchema,
  ddaModelInputsSchema,
  // bananaRequestSchema,
} from "../../src/schemas";
import { createFileFromBuffer } from "./file2";
import gs from "../../src/api-lib/db";
import { AuthFromReq } from "../../src/api-lib/auth";
import { getMimeTypeFromBuffer, extensions } from "../../src/lib/mimeTypes";

if (!gs.dba) throw new Error("gs.dba not defined");

const Stars = gs.dba.collection("stars");

function BufferFromBase64(base64: string | undefined) {
  return base64 && Buffer.from(base64, "base64");
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "4mb",
    },
  },
};

export default async function starItem(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const item = req.body?.item;
  if (!gs.dba) return res.status(500).end();

  const auth = AuthFromReq(req);
  const userId = await auth.userId();

  if (!userId) return res.status(401).end("Unauthorized");

  const modelInputs = await ddaModelInputsSchema.validate(item.modelInputs);
  const callInputs = await ddaCallInputsSchema.validate(item.callInputs);
  const result = item.result;

  const simulatedModelState = {
    prompt: { value: modelInputs.prompt || "" },
    shareInputs: { value: true },
    guidance_scale: { value: modelInputs.guidance_scale },
    num_inference_steps: { value: modelInputs.num_inference_steps },
    seed: { value: modelInputs.seed as number },
    negative_prompt: { value: modelInputs.negative_prompt || "" },
  };

  const images = {
    output: BufferFromBase64(result?.modelOutputs?.[0]?.image_base64),
    init: BufferFromBase64(modelInputs?.image),
    mask: BufferFromBase64(modelInputs?.mask_image),
  };
  if (!images.output)
    return res.status(400).end("Bad Request - no output file");
  delete result?.modelOutputs?.[0]?.image_base64;
  delete modelInputs?.image;
  delete modelInputs?.mask_image;

  const sharedInputs = sharedInputTextFromInputs(simulatedModelState);
  const mimeType = getMimeTypeFromBuffer(images.output);
  const ext = extensions[mimeType];
  const filename = sanitizeFilename(sharedInputs + "." + ext);

  const files: Star["files"] = {
    // @ts-expect-error: objectid
    output: (await createFileFromBuffer(images.output, { filename }))._id,
  };
  if (images.init)
    // @ts-expect-error: objectid
    files.init = (
      await createFileFromBuffer(images.init, {
        filename: "init_image.jpg", // TODO, file ext
      })
    )._id;
  if (images.mask)
    // @ts-expect-error: objectid
    files.mask = (
      await createFileFromBuffer(images.mask, {
        filename: "mask_image.jpg", // TODO, file ext
      })
    )._id;

  console.log(images);
  console.log(files);

  const entry: Partial<NodeCol<Star>> = {
    userId,
    date: new Date(),
    callInputs,
    modelInputs,
    files,
    // stars: 1,
    // starredBy: [userId],
    likes: 0,
  };

  console.log(entry);
  const insertResult = await Stars.insertOne(entry);
  const { insertedId } = insertResult;

  entry._id = insertedId;

  res.status(200).json(entry);
}
