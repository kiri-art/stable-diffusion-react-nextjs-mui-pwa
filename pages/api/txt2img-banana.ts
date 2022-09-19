import type { NextApiRequest, NextApiResponse } from "next";

export default async function txt2imgFetch(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.status(200).end("RELOAD APP");
}
