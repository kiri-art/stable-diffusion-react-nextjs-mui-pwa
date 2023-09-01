import type { NextApiRequest, NextApiResponse } from "next";
import NextAuth, { Session } from "next-auth";
// import { MongoDBAdapter } from "@auth/mongodb-adapter";
// import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
// import clientPromise from "../../src/api-lib/mongodb";

// import GithubProvider from "next-auth/providers/github";
import GithubProvider from "../../../src/api-lib/GithubProvider";
import GoogleProvider from "next-auth/providers/google";
import TwitterProvider, {
  TwitterLegacyProfile,
} from "next-auth/providers/twitter";

import gs from "../../../src/api-lib/db-full";
import GongoAuthAdapter, {
  AdapterUser,
} from "../../../src/api-lib/gongoAuthAdapter";
import { ipFromReq } from "../../../src/api-lib/ipCheck";
import { ObjectId } from "bson";

interface Service {
  service: string;
  id: string;
  profile: {
    id: string;
    displayName: string;
    name?: {
      familyName: string;
      givenName: string;
    };
    emails: { value: string; verified: boolean }[];
    photos: { value: string }[];
    provider: string;
    _json: Record<string, unknown>;
  };
}

function fromService<T extends Record<string, unknown>>(
  service: Service,
  overrides: T = {} as T
) {
  return {
    id: service.id,
    displayName: service.profile.displayName,
    name: service.profile.name
      ? service.profile.name.givenName + " " + service.profile.name.familyName
      : service.profile.displayName,
    emails: service.profile.emails,
    email: service.profile.emails[0].value,
    emailVerified: service.profile.emails[0].verified,
    photos: service.profile.photos,
    image: service.profile.photos[0].value,
    services: [service],
    ...overrides,
  };
}

export const authOptions = {
  adapter: GongoAuthAdapter(gs),

  callbacks: {
    // async session() <-- further below since it needs req/res access
  },

  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      // scope: "user:email",
      // allRawEmails: true,
      profile(profile) {
        const service = {
          service: "github",
          id: profile.id.toString(),
          profile: {
            id: profile.id.toString(),
            displayName: profile.name || "No GitHub name",
            username: profile.login,
            profileUrl: profile.html_url,

            // Note, this relies on our custom GithubProvider
            emails: profile.emails.map((email) => ({
              value: email.email,
              verified: email.verified,
              primary: email.primary,
              visibility: email.visibility,
            })),
            // [{ value: profile.email }],

            photos: [{ value: profile.avatar_url }],
            provider: "github",
            _json: profile,
          },
        };

        return fromService(service, {
          name: profile.name, // <-- full name in one string
        });
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      profile(profile) {
        const service: Service = {
          service: "google",
          id: profile.sub,
          profile: {
            id: profile.sub,
            displayName: profile.name,
            name: {
              familyName: profile.family_name,
              givenName: profile.given_name,
            },
            emails: [
              { value: profile.email, verified: profile.email_verified },
            ],
            photos: [{ value: profile.picture }],
            provider: "google",
            _json: profile,
          },
        };

        return fromService(service, {
          name: profile.name, // <-- full name in one string
        });
      },
    }),
    TwitterProvider({
      clientId: process.env.TWITTER_CONSUMER_KEY!,
      clientSecret: process.env.TWITTER_CONSUMER_SECRET!,
      // TwitterLegacyProfile unless { options: { version: "2.0" } }
      profile(profile: TwitterLegacyProfile) {
        const service: Service = {
          service: "twitter",
          id: profile.id_str,
          profile: {
            username: profile.screen_name,
            displayName: profile.name,
            // @ts-expect-error: "Request email address from users" in app perms
            emails: [{ value: profile.email }],
            // @ts-expect-error: "Request email address from users" in app perms
            email: profile.email,
            photos: [{ value: profile.profile_image_url_https }],
            image: profile.profile_image_url_https,
            provider: "twitter",
            _json: profile as unknown as Record<string, unknown>,
          },
        };

        return fromService(service, {
          name: profile.name, // <-- full name in one string
        });
      },
    }),
  ],
};

export default async function auth(req: NextApiRequest, res: NextApiResponse) {
  // @ ts-expect-error: problem with MongoDBAdapter
  return await NextAuth(req, res, {
    ...authOptions,
    callbacks: {
      ...authOptions.callbacks,
      // Let's only put callbacks here that require access to req/res.
      async session({
        session,
        user,
      }: {
        session: Session;
        user: AdapterUser;
      }) {
        session.user.id = user.id;
        // console.log("session", session);

        // Note, session called not only during session creation.  Should we
        // or should we not overwrite these values?
        await gs.dba.collection("sessions").updateOne(
          {
            userId: new ObjectId(user.id),
            expires: new Date(session.expires),
          },
          {
            $set: {
              ip: ipFromReq(req),
              userAgent:
                req.headers instanceof Headers
                  ? req.headers.get("user-agent")
                  : req.headers["user-agent"],
            },
          }
        );

        return session;
      },
    },
  });
}
