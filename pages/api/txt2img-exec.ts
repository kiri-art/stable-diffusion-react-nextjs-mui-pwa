import child_process from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { NextApiRequest, NextApiResponse } from "next";

const { STABLE_DIFFUSION_HOME } = process.env;
console.log({ STABLE_DIFFUSION_HOME });

export default async function txt2imgExec(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "sd-mui-"));
  const dir = tmpDir.split(path.sep).pop();

  const write = (obj: Record<string, unknown>) =>
    res.write(JSON.stringify(obj) + "\n");

  return new Promise((resolve, reject) => {
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Transfer-Encoding": "chunked",
      "Content-Encoding": "chunked",
    });

    const child = child_process.spawn(
      "conda run --no-capture-output -n ldm python scripts/txt2img.py --prompt hi --outdir " +
        tmpDir +
        " --skip_grid --n_iter 1 --n_samples 1",
      {
        shell: true,
        cwd: process.env.STABLE_DIFFUSION_HOME,
      }
    );

    child.stdout.on("data", (data) => {
      console.log(data.toString("utf8"));
      res.write(
        JSON.stringify({
          $type: "stdout",
          data: data.toString("utf8").trim(),
        }) + "\n"
      );
    });
    child.stderr.on("data", (data) => {
      console.log(data.toString("utf8"));
      res.write(
        JSON.stringify({
          $type: "stderr",
          data: data.toString("utf8").trim(),
        }) + "\n"
      );
    });

    child.on("close", () => {
      write({ $type: "done", dir });
      res.end();
      resolve(true);
    });
  });
}
