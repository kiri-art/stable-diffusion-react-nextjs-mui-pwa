import AWS from "aws-sdk";
import crypto from "crypto";
import sharp from "sharp";
import { fileTypeFromBuffer } from "file-type";

import { ObjectId } from "bson";
import gs /* Auth, User, Order,  ObjectId */ from "../../src/api-lib/db";
// import { format } from 'date-fns';

const AWS_S3_BUCKET = "kiri-art";

const defaults = {
  AWS_REGION: "eu-west-3", // Paris
};

const env = process.env;
AWS.config.update({
  accessKeyId: env.AWS_ACCESS_KEY_ID_APP || env.AWS_ACCESS_KEY_ID,
  secretAccessKey: env.AWS_SECRET_ACCESS_KEY_APP || env.AWS_SECRET_ACCESS_KEY,
  region: env.AWS_REGION_APP || env.AWS_REGION || defaults.AWS_REGION,
});

if (!gs.dba) throw new Error("gs.dba not set");

const Files = gs.dba.collection("files");

interface FileEntry {
  [key: string]: unknown;
  // _id: string | ObjectId;
  _id: ObjectId;
  filename?: string;
  sha256: string;
  size: number;
  type: string; // "image",
  mimeType?: string;
  createdAt: Date;
  image?: {
    format: sharp.Metadata["format"];
    size?: number;
    width?: number;
    height?: number;
  };
}

async function createFileFromBuffer(
  buffer: Buffer,
  {
    filename,
    mimeType,
    size,
    existingId,
    ...extra
  }: {
    filename?: string;
    mimeType?: string;
    size?: number;
    existingId?: string;
    extra?: Record<string, unknown>;
  } = {}
) {
  // TODO, check if it's an image.

  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
  const image = sharp(buffer);
  const metadata = await image.metadata();
  const now = new Date();

  size = size || Buffer.byteLength(buffer);
  if (!mimeType) {
    const fileType = await fileTypeFromBuffer(buffer);
    if (fileType) mimeType = fileType.mime;
  }

  const entry: FileEntry = {
    // _id: existingId || new ObjectId(),
    _id: new ObjectId(existingId),
    filename,
    sha256,
    size: size,
    type: "image",
    mimeType,
    createdAt: now,
    image: {
      format: metadata.format,
      size: metadata.size,
      width: metadata.width,
      height: metadata.height,
    },
    ...extra,
  };

  console.log(entry);

  const params = {
    Bucket: AWS_S3_BUCKET,
    Key: sha256,
    Body: buffer,
  };

  console.log(params);

  const result = await new AWS.S3().putObject(params).promise();
  console.log({ result });

  if (existingId) {
    const $set = (({ _id, ...rest }) => rest)(entry);
    await Files.updateOne({ _id: existingId }, { $set });
  } else {
    // @ts-expect-error: version mismatch... todo
    await Files.insertOne(entry);
  }

  // return [entry, buffer];
  return entry;
}

export type { FileEntry };
export { createFileFromBuffer };
