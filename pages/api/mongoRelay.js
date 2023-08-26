import { MongoClient } from "mongodb";
import makeExpressRelay from "mongodb-rest-relay/lib/express";

const MONGO_URL = process.env.MONGO_URL || "mongodb://127.0.0.1";
const client = new MongoClient(MONGO_URL);

// ts fails sometimes here (but not always???) because of version mismatch
export default makeExpressRelay((await client.connect()).db("sd-mui"));
