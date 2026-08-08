import Auth from "gongo-server/lib/auth-class";
import GongoServer from "gongo-server/lib/serverless";
import Database /* ObjectID */ from "gongo-server-db-mongo";
import gs /* { CreditCode, ObjectId, User } */ from "../../src/api-lib/db";
import createHandler from "../../src/lib/providerFetch/handlerServerless";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "4mb",
    },
  },
};

export default createHandler({ gs, Auth, GongoServer, Database });
