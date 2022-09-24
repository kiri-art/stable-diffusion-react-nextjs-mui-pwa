// import type { NextApiRequest, NextApiResponse } from "next";
import GongoServer from "gongo-server/lib/serverless";
import GongoAuth from "gongo-server/lib/auth";
import MongoDBA, { MongoDbaUser } from "gongo-server-db-mongo";
import Auth from "gongo-server/lib/auth-class";

/* eslint-disable @typescript-eslint/no-var-requires */
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
// import passport from "passport";
// import { Strategy as GoogleStrategy } from "passport-google-oauth2";
const GithubStrategy = require("passport-github2").Strategy;
const TwitterStrategy = require("passport-twitter").Strategy;

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
      scope: "email+profile",
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
      scope: "user:email",
      allRawEmails: true,
    },
    gongoAuth.passportVerify
  ),
  {
    //scope: 'https://www.googleapis.com/auth/userinfo.profile+https://www.googleapis.com/auth/userinfo.email'
    scope: "user:email",
  }
);

gongoAuth.use(
  new TwitterStrategy(
    {
      consumerKey: process.env.TWITTER_CONSUMER_KEY,
      consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
      callbackURL: ROOT_URL + "/api/gongoAuth?service=twitter",
      passReqToCallback: true,
      includeEmail: true,
    },
    gongoAuth.passportVerify
  ),
  {}
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

// TODO Sure we can move this all into gongo-server.
// @ts-expect-error: any
export default async function handler(req, res) {
  if (req.query.type === "setup") {
    gongoAuth.ensureDbStrategyData().then(() => res.end("OK"));
    return;
  }

  if (req.query.poll)
    return gs.expressPost()(req, res, () => {
      console.log("next");
    });

  if (!req.query.service)
    return res.status(400).end("No ?service= param specified");

  if (req.query.state) {
    if (!gs.dba) throw new Error("no gs.dba");
    const session = await gs.dba.collection("sessions").findOne({
      $or: [
        { ["oauth:" + req.query.service + ".state.handle"]: req.query.state },
        { ["oauth2:" + req.query.service + ".state.handle"]: req.query.state },
      ],
    });
    req.session = session;
  } else if (req.query.oauth_token) {
    if (!gs.dba) throw new Error("no gs.dba");
    const session = await gs.dba.collection("sessions").findOne({
      ["oauth:" + req.query.service + ".state.handle"]: req.query.state,
    });
    req.session = session;
  }

  const next = () =>
    res.status(400).end("No such service: " + req.query.service);

  const strategy = passport._strategies[req.query.service];
  if (!strategy) res.status(400).end("No such service: " + req.query.service);
  const authOpts: { scope?: string } = {};

  // untested with multiple scopes, _scopeSeparator, array, etc.
  if (strategy._scope) authOpts.scope = strategy._scope;

  passport.authenticate(
    req.query.service,
    authOpts,
    gongoAuth.boundPassportComplete(req, res)
  )(req, res, next);
}
