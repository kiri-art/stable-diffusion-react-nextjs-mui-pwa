/* eslint-disable @typescript-eslint/no-var-requires */

const crypto = require("crypto");
const GongoServer = require("gongo-server/lib/serverless").default;
const Auth = require("gongo-server/lib/auth-class").default;
const { AuthFromReq } = require("../../src/api-lib/auth");
const Database = require("gongo-server-db-mongo").default;
const ObjectId = require("bson").ObjectId;
const { MongoClient } = require("mongodb");
const fetch = require("node-fetch");
const sharp = require("sharp");

// only in upload, could do in different lambda
const asyncBusboy = require("@projectfunction/async-busboy");
const fs = require("fs/promises");

const env = process.env;
const AWS = require("aws-sdk");
AWS.config.update({
  accessKeyId: env.AWS_ACCESS_KEY_ID_APP || env.AWS_ACCESS_KEY_ID,
  secretAccessKey: env.AWS_SECRET_ACCESS_KEY_APP || env.AWS_SECRET_ACCESS_KEY,
  // region: AWS_DEFAULT_REGION,
  region: "eu-west-3", // Paris
});

// const s3 = new AWS.S3({ apiVersion: "2006-03-01" });

const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1";

const gs = new GongoServer({
  dba: new Database(MONGO_URL, "sd-mui", MongoClient),
});

const db = gs.dba;

// console.log({ gs, db });
const Files = db.collection("files");

function resHeaders(res, entry) {
  // next/image doesn't allow chaining on setHeader()
  res.setHeader("Content-Type", entry.mimeType);
  res.setHeader("Content-Disposition", `inline; filename="${entry.filename}"`);
  res.setHeader("Cache-Control", "public,max-age=31536000,immutable");
  res.setHeader("ETag", entry.sha256);
}

async function createFromBuffer(
  buffer,
  filename,
  mimeType,
  size,
  existingId,
  extra
) {
  // TODO, check if it's an image.

  const sha256 = crypto.createHash("sha256").update(buffer).digest("hex");
  const image = sharp(buffer);
  const metadata = await image.metadata();
  const now = new Date();

  const entry = {
    _id: existingId || new ObjectId(),
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
    Bucket: "kiri-art",
    Key: sha256,
    Body: buffer,
  };

  console.log(params);

  const result = await new AWS.S3().putObject(params).promise();
  console.log({ result });

  if (existingId) {
    delete entry._id;
    await Files.updateOne({ _id: existingId }, { $set: entry });
  } else {
    await Files.insertOne(entry);
  }

  return [entry, buffer];
}

async function createFromSourceUrl(sourceUrl, existingId) {
  const response = await fetch(sourceUrl);
  const buffer = await response.buffer();

  const contentType = response.headers.get("content-type");
  const contentLength = parseInt(response.headers.get("content-length"));

  return await createFromBuffer(
    buffer,
    sourceUrl.match(/([^\/])+$/)[0],
    contentType,
    contentLength,
    existingId,
    { sourceUrl }
  );
}

async function PostRequest(req, res) {
  // TODO, ideally use custom onFile handler to avoid write to disk
  // https://www.npmjs.com/package/@projectfunction/async-busboy
  const { files, fields } = await asyncBusboy(req);

  let authData;
  if (fields.auth) {
    try {
      authData = JSON.parse(fields.auth);
    } catch (e) {
      return res.status(400).send("Bad Request");
    }
  }

  let auth = new Auth(gs.dba, authData || {});
  let userId = await auth.userId();

  if (!userId) {
    auth = AuthFromReq(req);
    userId = await auth.userId();
  }

  if (!userId) {
    res.status(403).send("Forbidden");
  }

  // TODO XXX some checks.  #files, size, types?

  const results = new Array(files.length);
  for (let i = 0; i < files.length; i++) {
    const file = files[0];
    const stat = await fs.stat(file.path);

    const buffer = await new Promise((resolve, reject) => {
      const chunks = [];
      file.on("data", (chunk) => chunks.push(chunk));
      file.on("error", (err) => reject(err));
      file.on("end", () => resolve(Buffer.concat(chunks)));
    });

    const [entry] = await createFromBuffer(
      buffer,
      file.filename,
      file.mimeType,
      stat.size,
      undefined,
      { userId }
    );

    results[i] = entry;
  }

  res.setHeader("Content-Type", "application/json");
  res.status(200).send(JSON.stringify(results));
}

async function fileRoute(req, res) {
  if (req.method === "POST") return PostRequest(req, res);

  const query = req.query;
  if (!(query.id || query.sourceUrl))
    throw new Error("Need an id or sourceUrl");

  const dbQuery = {};
  if (query.id) dbQuery._id = new ObjectId(req.query.id);
  if (query.sourceUrl) dbQuery.sourceUrl = query.sourceUrl;

  let buffer;
  let file = await Files.findOne(dbQuery);

  if (file) {
    if (!file.sha256) {
      if (file.sourceUrl)
        [file, buffer] = await createFromSourceUrl(file.sourceUrl, file._id);
      else
        throw new Error("File has no sha256 and no sourceUrl, _id" + query._id);
    }
  } /* i.e. !file */ else {
    if (query.id) return res.status(404).end();
    else if (query.sourceUrl) [file, buffer] = createFromSourceUrl(sourceUrl);
    else throw new Error("not possible");
  }

  if (query.return == "meta") {
    return res.status(200).json(file);
  }

  if (!file.sha256) throw new Error("should not happen");

  if (file.sha256 === req.headers["if-none-match"]) {
    // TODO caching
    // Note that the server generating a 304 response MUST generate any of
    // the following header fields that would have been sent in a 200 (OK)
    // response to the same request: Cache-Control, Content-Location, Date,
    // ETag, Expires, and Vary.
    // https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/If-None-Match
    resHeaders(res, file);
    res.status(304).end();
  }

  const params = { Bucket: "kiri-art", Key: file.sha256 };
  const result = await new AWS.S3().getObject(params).promise();
  buffer = result.Body;

  resHeaders(res, file);
  res.status(200).send(buffer);

  /*
  res.status(200).json({
    body: req.body,
    query: req.query,
    cookies: req.cookies,
  });
  */
}

export const config = {
  api: {
    bodyParser: false,
  },
};

module.exports = { default: fileRoute, config, __esModule: true };
