import { NextApiRequest } from "next";
import gs, { Auth } from "./db";

export function AuthFromReq(req: NextApiRequest) {
  const cookie = req.headers.cookie;
  const nextAuthSessionToken = (function () {
    // next-auth.session-token=45df020e-1424-4d13-8bd5-5bd59851c774
    const match = cookie && cookie.match(/\bnext-auth\.session-token=([^;]+)/);
    return match && match[1];
  })();

  const auth = req.method === "POST" ? req.body?.auth : req.query?.auth;
  return new Auth(gs.dba, { nextAuthSessionToken, ...auth });
}
