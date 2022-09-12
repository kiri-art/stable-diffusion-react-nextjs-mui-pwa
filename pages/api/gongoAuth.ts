// import type { NextApiRequest, NextApiResponse } from "next";
import GongoServer from "gongo-server/lib/serverless";
import GongoAuth from "gongo-server/lib/auth";
import MongoDBA, { MongoDbaUser } from "gongo-server-db-mongo";

/* eslint-disable @typescript-eslint/no-var-requires */
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
// import passport from "passport";
// import { Strategy as GoogleStrategy } from "passport-google-oauth2";
const GithubStrategy = require("passport-github2").Strategy;

const env = process.env;
const MONGO_URL = env.MONGO_URL || "mongodb://127.0.0.1";
const ROOT_URL = (
  env.ROOT_URL ||
  "http" +
    (env.VERCEL_URL && env.VERCEL_URL.match(/^localhost:/) ? "" : "s") +
    "://" +
    env.VERCEL_URL
).replace(/\/$/, "");

/*
console.log({
  ENV_ROOT_URL: env.ROOT_URL,
  ENV_VERCEL_URL: env.VERCEL_URL,
  CHOSEN_ROOT_URL: ROOT_URL,
});
*/

const gs = new GongoServer({
  dba: new MongoDBA(MONGO_URL, "sd-mui"),
});

const gongoAuth = new GongoAuth(gs, passport);
// gs.db.Users.ensureAdmin('dragon@wastelands.net', 'initialPassword');

gongoAuth.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: ROOT_URL + "/api/gongoAuth?service=google",
      passReqToCallback: true,
    },
    gongoAuth.passportVerify
  ),
  {
    //scope: 'https://www.googleapis.com/auth/userinfo.profile+https://www.googleapis.com/auth/userinfo.email'
    scope: "email+profile",
  }
);

gongoAuth.use(
  new GithubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: ROOT_URL + "/api/gongoAuth?service=github",
      passReqToCallback: true,
    },
    gongoAuth.passportVerify
  ),
  {
    //scope: 'https://www.googleapis.com/auth/userinfo.profile+https://www.googleapis.com/auth/userinfo.email'
    scope: "user:email",
  }
);

//module.exports = passport.authenticate('google', gongoAuth.passportComplete);

if (gs.dba) {
  // TODO, implement onCreateUser hook in gongo-server. For now:
  const Users = gs.dba.Users;
  const origCreateUser = Users.createUser;
  gs.dba.Users.createUser = async function sbMuiCreateUser(
    origCallback?: ((dbaUser: Partial<MongoDbaUser>) => void) | undefined
  ) {
    function callback(user: Partial<MongoDbaUser>): void {
      origCallback && origCallback(user);
      user.credits = { free: 20, paid: 0 };
      user.createdAt = new Date();
    }
    return origCreateUser.call(Users, callback);
  };
}

// @ts-expect-error: any
export default function handler(req, res) {
  if (req.query.type === "setup") {
    gongoAuth.ensureDbStrategyData().then(() => res.end("OK"));
    return;
  }

  if (!req.query.service)
    return res.status(400).end("No ?service= param specified");

  const next = () =>
    res.status(400).end("No such service: " + req.query.service);

  passport.authenticate(
    req.query.service,
    gongoAuth.boundPassportComplete(req, res)
  )(req, res, next);
}
