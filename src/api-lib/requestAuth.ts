import { type Document, ObjectId, type WithId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";

import { createAuthOptions } from "../../pages/api/auth/[...nextauth]";
import gs from "./db-full";

export interface NativeUserDocument extends Document {
  admin?: boolean;
}

export class RequestAuthError extends Error {
  constructor(
    public readonly statusCode: 401 | 403,
    message: "Unauthorized" | "Forbidden",
  ) {
    super(message);
    this.name = "RequestAuthError";
  }
}

/** Resolve identity exclusively from the server-side NextAuth session cookie. */
export async function resolveAuthenticatedUserId(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<string | null> {
  const session = await getServerSession(req, res, createAuthOptions(req));
  const userId = session?.user?.id;

  return typeof userId === "string" && userId.length > 0 ? userId : null;
}

/** Require a current administrator and return their native Mongo user record. */
export async function requireAdminUser(
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<WithId<NativeUserDocument>> {
  const userId = await resolveAuthenticatedUserId(req, res);
  if (!userId || !ObjectId.isValid(userId)) {
    throw new RequestAuthError(401, "Unauthorized");
  }

  const db = await gs.dba.dbPromise;
  const user = await db.collection<NativeUserDocument>("users").findOne({
    _id: new ObjectId(userId),
    deletionPendingAt: { $exists: false },
  });

  if (!user) throw new RequestAuthError(401, "Unauthorized");
  if (!user.admin) throw new RequestAuthError(403, "Forbidden");

  return user;
}
