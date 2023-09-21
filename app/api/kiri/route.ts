import Auth from "gongo-server/lib/auth-class";
import GongoServer from "gongo-server/lib/serverless";
import Database from "gongo-server-db-mongo";
import gs from "../../../src/api-lib/db";
import createHandler from "../../../src/lib/providerFetch/handlerEdge";

/*
// TODO, in theory we could stream this now if we move request info to query string
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "4mb",
    },
  },
};
*/

// TODO deps
const handler = createHandler({ gs, Auth, GongoServer, Database });

export const runtime = "edge";
export const POST = handler;
export const GET = function () {
  return new Response("GET not supported", { status: 400 });
};
