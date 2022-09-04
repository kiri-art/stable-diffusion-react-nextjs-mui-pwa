import txt2imgOptsSchema from "../schemas/txt2imgOpts";
import type { Txt2ImgOpts } from "../schemas/txt2imgOpts";

async function exec(
  opts: Txt2ImgOpts,
  {
    setLog,
    imgResult,
    _auth,
  }: {
    setLog: (log: string[]) => void;
    imgResult: React.RefObject<HTMLImageElement>;
    _auth?: Record<string, unknown>;
  }
) {
  let log: string[] = [];
  let up = 0;
  console.log("start");

  const response = await fetch("/api/txt2img-exec", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ modelOpts: opts }),
  });

  if (!response.body) throw new Error("No body");
  const reader = response.body.getReader();

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    try {
      // const str = Buffer.from(value).toString("utf-8");
      // @ts-expect-error: TODO
      const str = String.fromCharCode.apply(null, value);
      const strs = str.trim().split("\n");
      for (const str of strs) {
        const obj = JSON.parse(str);
        if (obj.$type === "stdout" || obj.$type === "stderr") {
          let line = obj.data;
          while (line.endsWith("\u001b[A")) {
            line = line.substr(0, line.length - "\u001b[A".length);
            up++;
          }
          log = log.slice(0, log.length - up).concat([line]);
          up = 0;
          setLog(log);
        } else if (obj.$type === "done") {
          setLog(log.concat(["[WebUI] Loading image..."]));
          const response = await fetch("/api/imgFetchAndDelete?dir=" + obj.dir);
          const blob = await response.blob();
          const objectURL = URL.createObjectURL(blob);
          if (imgResult.current) imgResult.current.src = objectURL;
          setLog([]);
        } else {
          console.log(obj);
        }
      }
    } catch (e) {
      console.error(e);
      console.error(value);
      throw new Error("Invalid JSON");
    }
  }
  console.log("done");
}

async function banana(
  opts: Txt2ImgOpts,
  {
    setLog,
    imgResult,
    dest,
    auth,
  }: {
    setLog: (log: string[]) => void;
    imgResult: React.RefObject<HTMLImageElement>;
    dest: string; // "banana-local" | "banana-remote" | "exec";
    auth?: Record<string, unknown>;
  }
) {
  setLog(["[WebUI] Sending " + dest + " request..."]);
  const response = await fetch("/api/txt2img-banana", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ modelOpts: opts, fetchOpts: { dest, auth } }),
  });

  let result;
  try {
    result = await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    setLog(["FAILED: " + message]);
    return;
  }

  // It turns out sometimes we can still get { message: "" } and success.
  // if (!result.message) {
  if (
    !(
      result &&
      result.modelOutputs &&
      result.modelOutputs.length &&
      result.modelOutputs[0].image_base64
    )
  ) {
    setLog(JSON.stringify(result, null, 2).split("\n"));
    return;
  }

  const imgBase64 = result.modelOutputs[0].image_base64;
  const buffer = Buffer.from(imgBase64, "base64");
  const blob = new Blob([buffer], { type: "image/png" });
  const objectURL = URL.createObjectURL(blob);
  if (imgResult.current) imgResult.current.src = objectURL;
  setLog([]);

  // console.log(result);
}

const runners = { exec, banana };

export default async function txt2img(
  opts: unknown,
  {
    setLog,
    imgResult,
    dest,
    auth,
  }: {
    setLog: (log: string[]) => void;
    imgResult: React.RefObject<HTMLImageElement>;
    dest: string; // "exec" | "banana-local" | "banana-remote";
    auth?: Record<string, unknown>;
  }
) {
  const proto = dest.split("-")[0] as "exec" | "banana";
  const runner = runners[proto];
  //console.log("runner", dest, runner);
  console.log(opts);
  const modelOpts = txt2imgOptsSchema.cast(opts);
  const result = await runner(modelOpts, { setLog, imgResult, dest, auth });
  return result;
}
