import JSZip from "jszip";
import { ObjectId } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import gs from "../../src/api-lib/db-full";
import { resolveAuthenticatedUserId } from "../../src/api-lib/requestAuth";
import { exportAccountData } from "../../src/server/account-data";

function setDownloadSecurityHeaders(res: NextApiResponse): void {
  res.setHeader(
    "Cache-Control",
    "private, no-store, no-cache, max-age=0, must-revalidate",
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Frame-Options", "DENY");
}

export default async function myData(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  setDownloadSecurityHeaders(res);

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const authenticatedUserId = await resolveAuthenticatedUserId(req, res);
  if (!authenticatedUserId || !ObjectId.isValid(authenticatedUserId)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (!gs.dba) {
    return res.status(503).json({ error: "Database unavailable" });
  }

  try {
    const db = await gs.dba.dbPromise;
    const accountData = await exportAccountData({
      db,
      targetUserId: authenticatedUserId,
    });
    if (!accountData) {
      return res.status(404).json({ error: "Account not found" });
    }

    const zip = new JSZip();
    for (const collection of accountData.collections) {
      zip.file(
        `${collection.name}.json`,
        `${JSON.stringify(collection.data, null, 2)}\n`,
      );
    }

    const archive = await zip.generateAsync({
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
      type: "nodebuffer",
    });

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="kiri-account-data-${accountData.targetUserId}.zip"`,
    );
    res.setHeader("Content-Length", archive.byteLength.toString());
    return res.status(200).send(archive);
  } catch (error) {
    console.error("Account data export failed", error);
    return res.status(500).json({ error: "Could not export account data" });
  }
}
