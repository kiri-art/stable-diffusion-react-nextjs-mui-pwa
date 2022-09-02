import type { NextApiRequest, NextApiResponse } from "next";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export default async function test(req: NextApiRequest, res: NextApiResponse) {
  res.writeHead(200, {
    "Content-Type": "application/json",
    "Transfer-Encoding": "chunked",
    "Content-Encoding": "chunked",
  });

  for (let i = 0; i < 25; i++) {
    res.write(
      JSON.stringify({
        $type: "stdout",
        data: i.toString() + "\u001b[A",
      })
    );
    await sleep(100);
  }

  res.end();
}
