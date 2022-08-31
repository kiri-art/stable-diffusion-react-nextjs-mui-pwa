import child_process from "node:child_process";
import type { NextApiRequest, NextApiResponse } from "next";

const { STABLE_DIFFUSION_HOME } = process.env;
console.log({ STABLE_DIFFUSION_HOME });

export default async function txt2imgExec(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return new Promise((resolve, reject) => {
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Transfer-Encoding": "chunked",
      "Content-Encoding": "chunked",
    });

    const child = child_process.spawn(
      "conda run --no-capture-output -n ldm python scripts/txt2img.py --prompt hi --outdir /tmp --skip_grid --n_samples 1",
      {
        shell: true,
        cwd: process.env.STABLE_DIFFUSION_HOME,
      }
    );

    child.stdout.on("data", (data) => {
      console.log(data.toString("utf8"));
      res.write(
        JSON.stringify({ $type: "stdout", data: data.toString("utf8") })
      );
    });
    child.stderr.on("data", (data) => {
      console.log(data.toString("utf8"));
      res.write(
        JSON.stringify({ $type: "stderr", data: data.toString("utf8") })
      );
    });
    child.on("close", () => {
      res.end();
      resolve(true);
    });
  });
}
