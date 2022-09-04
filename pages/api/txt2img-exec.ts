import child_process from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import type { NextApiRequest, NextApiResponse } from "next";
import txt2imgOptsSchema from "../../src/schemas/txt2imgOpts";

const { STABLE_DIFFUSION_HOME } = process.env;
console.log({ STABLE_DIFFUSION_HOME });

export default async function txt2imgExec(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (process.env.NODE_ENV !== "development") {
    res.status(400);
    res.end();
    return;
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "sd-mui-"));
  const dir = tmpDir.split(path.sep).pop();
  const opts = req.query;
  const modelOpts = txt2imgOptsSchema.cast(opts);
  console.log({ modelOpts });

  const cmdOpts = Object.fromEntries(
    Object.entries(modelOpts).map(([key, value]) => {
      if (key === "guidance_scale") return ["scale", value];
      if (key === "width") return ["W", value];
      if (key === "height") return ["H", value];
      if (key === "num_inference_steps") return ["ddim_steps", value];
      return [key, value];
    })
  );

  console.log({ cmdOpts });

  const cmdString = [
    "conda run --no-capture-output -n ldm",
    "python scripts/txt2img.py --outdir " + tmpDir,
    "--skip_grid --n_iter 1 --n_samples 1",
  ]
    .concat(
      Object.entries(cmdOpts).map(
        ([key, val]) =>
          "--" + key + " " + (typeof val === "string" ? "'" + val + "'" : val)
      )
    )
    .join(" ");

  const write = (obj: Record<string, unknown>) =>
    res.write(JSON.stringify(obj) + "\n");

  return new Promise((resolve, _reject) => {
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Transfer-Encoding": "chunked",
      "Content-Encoding": "chunked",
    });

    /*
      "conda run --no-capture-output -n ldm python scripts/txt2img.py --prompt hi --outdir " +
        tmpDir +
        " --skip_grid --n_iter 1 --n_samples 1"
        */

    const child = child_process.spawn(cmdString, {
      shell: true,
      cwd: process.env.STABLE_DIFFUSION_HOME,
    });

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
