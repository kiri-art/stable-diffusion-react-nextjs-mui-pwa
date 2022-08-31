import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";

import type { NextApiRequest, NextApiResponse } from "next";

export default async function imgFetchAndDelete(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (
    !(typeof req.query.dir === "string" && req.query.dir.startsWith("sd-mui"))
  ) {
    res.status(400);
    res.end();
    return;
  }

  const dir = path.join(os.tmpdir(), req.query.dir);

  // Think about this more... process is killed after stream ends,
  // before we can clean up.  So let's load to memory first.

  const samples = path.join(dir, "samples");
  const imgPath = path.join(samples, "00000.png");
  const img = await fs.readFile(imgPath);
  await fs.rm(imgPath);
  await fs.rmdir(path.join(dir, "samples"));
  await fs.rmdir(dir);

  res.writeHead(200, {
    "Content-Type": "image/png",
  });
  res.end(img);
}
