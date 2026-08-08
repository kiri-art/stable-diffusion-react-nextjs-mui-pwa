import { type Db, ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import gs from "../../src/api-lib/db-full";
import {
  RequestAuthError,
  resolveAuthenticatedUserId,
} from "../../src/api-lib/requestAuth";
import {
  AccountDeletionConfigurationError,
  deleteAccountData,
  LastAdminDeletionError,
} from "../../src/server/account-data";
import { createAccountDeletionExternalServices } from "../../src/server/account-data/external";

const CONFIRMATION = "PERMANENTLY ERASE MY DATA";
const ACTION_HEADER = "x-kiri-account-action";

interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

function sendError(
  res: NextApiResponse,
  status: number,
  code: string,
  message: string,
) {
  return res
    .status(status)
    .json({ error: { code, message } } satisfies ErrorResponse);
}

function hasHeaderValue(req: NextApiRequest, expected: string): boolean {
  const value = req.headers[ACTION_HEADER];
  return typeof value === "string" && value === expected;
}

async function isFinalAdmin(db: Db, targetUserId: ObjectId): Promise<boolean> {
  const user = await db
    .collection("users")
    .findOne({ _id: targetUserId }, { projection: { admin: 1 } });
  if (!user?.admin) return false;

  return (await db.collection("users").countDocuments({ admin: true })) <= 1;
}

export default async function myDataDelete(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  res.setHeader("Cache-Control", "no-store");

  try {
    if (req.method !== "POST") {
      res.setHeader("Allow", "POST");
      return sendError(res, 405, "METHOD_NOT_ALLOWED", "Only POST is allowed");
    }
    if (!hasHeaderValue(req, "delete")) {
      return sendError(
        res,
        400,
        "ACTION_HEADER_REQUIRED",
        `The ${ACTION_HEADER} header must be set to delete`,
      );
    }
    if (
      typeof req.body !== "object" ||
      req.body === null ||
      req.body.confirmation !== CONFIRMATION
    ) {
      return sendError(
        res,
        400,
        "CONFIRMATION_REQUIRED",
        "The account-deletion confirmation did not match",
      );
    }

    const authenticatedUserId = await resolveAuthenticatedUserId(req, res);
    if (!authenticatedUserId || !ObjectId.isValid(authenticatedUserId)) {
      return sendError(res, 401, "UNAUTHORIZED", "Unauthorized");
    }

    const targetUserId = new ObjectId(authenticatedUserId);
    const db = await gs.dba.dbPromise;
    if (await isFinalAdmin(db, targetUserId)) {
      return sendError(
        res,
        409,
        "LAST_ADMIN",
        "The final administrator account cannot be deleted",
      );
    }

    const report = await deleteAccountData({
      db,
      client: gs.dba.client,
      targetUserId,
      external: createAccountDeletionExternalServices(),
    });
    if (report.status === "not_found") {
      return sendError(
        res,
        404,
        "ACCOUNT_NOT_FOUND",
        "The authenticated account no longer exists",
      );
    }

    return res.status(200).json(report);
  } catch (error) {
    if (error instanceof RequestAuthError) {
      return sendError(
        res,
        error.statusCode,
        error.statusCode === 401 ? "UNAUTHORIZED" : "FORBIDDEN",
        error.message,
      );
    }
    if (error instanceof LastAdminDeletionError) {
      return sendError(res, 409, "LAST_ADMIN", error.message);
    }
    if (error instanceof AccountDeletionConfigurationError) {
      return sendError(
        res,
        503,
        "ACCOUNT_DELETION_UNAVAILABLE",
        "Account deletion is temporarily unavailable",
      );
    }

    console.error("Account deletion failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return sendError(
      res,
      500,
      "ACCOUNT_DELETION_FAILED",
      "Account deletion failed",
    );
  }
}
