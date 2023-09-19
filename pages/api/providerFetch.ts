import createHandler from "../../src/lib/providerFetch/handlerServerless";
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

export default createHandler({ gs, Auth, GongoServer, Database });
