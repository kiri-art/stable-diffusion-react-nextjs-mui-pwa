import stableDiffusionInputsSchema from "../../src/schemas/stableDiffusionInputs";
import type { StableDiffusionInputs } from "../../src/schemas/stableDiffusionInputs";
import bananaCallInputsSchema, {
  BananaCallInputs,
} from "../schemas/bananaCallInputs";
import blackImgBase64 from "../blackImgBase64";
import bananaFetch from "../bananaFetch";
import { db } from "gongo-client-react";

const History = typeof window === "object" && db.collection("history");

async function exec(
  opts: StableDiffusionInputs,
  callInputs: BananaCallInputs,
  {
    setLog,
    setImgSrc,
    _auth,
    _MODEL_NAME,
  }: {
    setLog: (log: string[]) => void;
    setImgSrc: React.Dispatch<React.SetStateAction<string>>;
    _auth?: Record<string, unknown>;
    _MODEL_NAME?: string;
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
          setImgSrc(objectURL);
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
  modelInputs: StableDiffusionInputs,
  callInputs: BananaCallInputs,
  {
    setLog,
    setImgSrc,
    dest,
    auth,
    MODEL_NAME,
  }: {
    setLog: (log: string[]) => void;
    setImgSrc: React.Dispatch<React.SetStateAction<string>>;
    dest: string; // "banana-local" | "banana-remote" | "exec";
    auth?: Record<string, unknown>;
    MODEL_NAME?: string;
  }
) {
  return bananaFetch("/api/sd-banana", modelInputs, callInputs, {
    setLog,
    setImgSrc,
    dest,
    auth,
    MODEL_NAME,
  });
}

const runners = { exec, banana };

export default async function txt2img(
  model_inputs: unknown,
  call_inputs: unknown,
  {
    setLog,
    setImgSrc,
    setNsfw,
    dest,
    auth,
    MODEL_NAME,
  }: {
    setLog: (log: string[]) => void;
    setImgSrc: React.Dispatch<React.SetStateAction<string>>;
    setNsfw: React.Dispatch<React.SetStateAction<boolean>>;
    dest: string; // "exec" | "banana-local" | "banana-remote";
    auth?: Record<string, unknown>;
    MODEL_NAME?: string;
  }
) {
  const proto = dest.split("-")[0] as "exec" | "banana";
  const runner = runners[proto];
  //console.log("runner", dest, runner);
  console.log({ model_inputs, call_inputs });
  const modelInputs = stableDiffusionInputsSchema.cast(model_inputs);
  const callInputs = bananaCallInputsSchema.cast(call_inputs);

  // TODO need to fix this in Controlers
  // @ts-expect-error: doesn't exist, need to fix as above
  delete modelInputs.randomizeSeed;
  // @ts-expect-error: doesn't exist, need to fix as above
  delete modelInputs.shareInputs;

  // @ts-expect-error: doesn't exist, need to fix as above
  callInputs.safety_checker = modelInputs.safety_checker;
  // @ts-expect-error: doesn't exist, need to fix as above
  delete modelInputs.safety_checker;

  if (modelInputs.MODEL_ID) {
    callInputs.MODEL_ID = modelInputs.MODEL_ID;
    delete modelInputs.MODEL_ID;
  }

  const result = await runner(modelInputs, callInputs, {
    setLog,
    setImgSrc,
    dest,
    auth,
    MODEL_NAME,
  });

  console.log({ result });

  if (result?.$success?.modelOutputs?.[0].image_base64 === blackImgBase64) {
    console.log("NSFW");
    result.$success._NSFW = true;
    setNsfw(true);
  } else {
    setNsfw(false);
  }

  if (History && result?.$success)
    History.insert({
      date: new Date(),
      modelInputs,
      callInputs,
      result: result.$success,
    });

  return result;
}
