import { db } from "gongo-client-react";
import { v4 as uuidv4 } from "uuid";

import { REQUIRE_REGISTRATION } from "../lib/client-env";
import stableDiffusionInputsSchema from "../../src/schemas/stableDiffusionInputs";
import type { StableDiffusionInputs } from "../../src/schemas/stableDiffusionInputs";
import bananaCallInputsSchema, {
  BananaCallInputs,
} from "../schemas/bananaCallInputs";
import blackImgBase64 from "../blackImgBase64";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function updateFinishedStep(
  callID: string,
  timestampMs: number,
  value: Record<string, unknown>
) {
  await fetch("/api/bananaUpdate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      callID,
      step: {
        name: "finished",
        date: timestampMs,
        value: value,
      },
    }),
  });
}

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
  // This is quite distracting, need to rethink this ;)
  // setLog(["[WebUI] Sending " + dest + " request..."]);
  setLog([""]);
  const response = await fetch("/api/sd-banana", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      modelInputs,
      callInputs,
      fetchOpts: { dest, auth, MODEL_NAME },
    }),
  });

  let result;
  try {
    result = await response.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    setLog(["FAILED: " + message]);
    return { $error: { message } };
  }

  if (REQUIRE_REGISTRATION) {
    // @ts-expect-error: TODO
    const _id = db.auth.userId;
    // TODO, _update should allow mongo modifier
    const users = db.collection("users");
    const user = users.findOne({ _id });
    if (!(user && result.credits)) return;
    user.credits = result.credits;
    db.collection("users")._update(_id, user);
  }

  const callID = result.callID;
  const initialResult = result;
  console.log({ initialResult });

  while (!(result.finished || result.modelOutputs)) {
    await sleep(500);
    console.log("Request");
    /*
    const response = await fetch(
      "/api/bananaCheck?callID=" + callID
    );
    */

    const payload = {
      id: uuidv4(),
      created: Math.floor(Date.now() / 1000),
      longPoll: true,
      callID: callID,
    };

    const response = await fetch("https://api.banana.dev/check/v4/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    try {
      result = await response.json();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setLog(["FAILED: " + message]);
      return { $error: { message } };
    }

    console.log(result);

    if (result.message.match(/error/)) {
      setLog(["FAILED: " + result.message]);
      return { $error: result };
    }
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
    if (callID)
      updateFinishedStep(
        callID,
        (result.created && result.created * 1000) || Date.now(),
        { $error: result }
      );
    setLog(JSON.stringify(result, null, 2).split("\n"));
    return { $error: result };
  }

  if (callID)
    updateFinishedStep(callID, result.created * 1000, { $success: true });
  const imgBase64 = result.modelOutputs[0].image_base64;
  const buffer = Buffer.from(imgBase64, "base64");
  const blob = new Blob([buffer], { type: "image/png" });
  const objectURL = URL.createObjectURL(blob);
  setImgSrc(objectURL);
  setLog([]);

  // console.log(result);
  return { $success: result };
}

const runners = { exec, banana };

export default async function txt2img(
  model_inputs: unknown,
  call_inputs: unknown,
  {
    setLog,
    setImgSrc,
    dest,
    auth,
    MODEL_NAME,
  }: {
    setLog: (log: string[]) => void;
    setImgSrc: React.Dispatch<React.SetStateAction<string>>;
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

  console.log(result);

  if (result?.$success?.modelOutputs?.[0].image_base64 === blackImgBase64) {
    console.log("NSFW");
    result.$success._NSFW = true;
  }

  return result;
}
