import type { NextApiRequest, NextApiResponse } from "next";
import GongoServer from "gongo-server/lib/serverless";
import GongoAuth from "gongo-server/lib/auth";
import MongoDBA from "gongo-server-db-mongo";

/* eslint-disable @typescript-eslint/no-var-requires */
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
// import passport from "passport";
// import { Strategy as GoogleStrategy } from "passport-google-oauth2";

const env = process.env;
const MONGO_URL = env.MONGO_URL || "mongodb://127.0.0.1";
const ROOT_URL =
  env.ROOT_URL ||
  "http" +
    (env.VERCEL_URL.match(/^localhost:/) ? "" : "s") +
    "://" +
    env.VERCEL_URL;

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
      callbackURL: ROOT_URL + "/api/gongoAuth",
      passReqToCallback: true,
    },
    gongoAuth.passportVerify
  ),
  {
    //scope: 'https://www.googleapis.com/auth/userinfo.profile+https://www.googleapis.com/auth/userinfo.email'
    scope: "email+profile",
  }
);

//module.exports = passport.authenticate('google', gongoAuth.passportComplete);

// @ts-expect-error: any
export default function handler(req, res, next) {
  if (req.query.type === "setup") {
    gongoAuth.ensureDbStrategyData().then(() => res.end("OK"));
    return;
  }

  passport.authenticate("google", gongoAuth.boundPassportComplete(req, res))(
    req,
    res,
    next
  );
}
