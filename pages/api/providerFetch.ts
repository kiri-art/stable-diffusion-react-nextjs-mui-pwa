import { ProviderFetchServerless } from "../../src/lib/providerFetch";
import gs /* { CreditCode, ObjectId, User } */ from "../../src/api-lib/db";
import Auth from "gongo-server/lib/auth-class";
import GongoServer from "gongo-server/lib/serverless";
import Database /* ObjectID */ from "gongo-server-db-mongo";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "4mb",
    },
  },
};

const serverless = new ProviderFetchServerless();

const express = serverless.express({ gs, Auth, GongoServer, Database });

export default express;
