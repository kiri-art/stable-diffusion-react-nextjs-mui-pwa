import { db } from "gongo-client-react";
import { v4 as uuidv4 } from "uuid";

import { REQUIRE_REGISTRATION } from "./lib/client-env";
import stableDiffusionInputsSchema from "../src/schemas/stableDiffusionInputs";
import type { StableDiffusionInputs } from "../src/schemas/stableDiffusionInputs";
import bananaCallInputsSchema, {
  BananaCallInputs,
} from "./schemas/bananaCallInputs";
import { UpsampleCallInputs, UpsampleModelInputs } from "./schemas";
import bananaUrl from "./lib/bananaUrl";

type ModelInputs = StableDiffusionInputs | UpsampleModelInputs;
type CallInputs = BananaCallInputs | UpsampleCallInputs;

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

async function runner(
  api_path: string,
  modelInputs: ModelInputs,
  callInputs: CallInputs,
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
  const response = await fetch(api_path, {
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

  const text = await response.text();
  let result;
  try {
    result = JSON.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(error);
    console.error(text);
    setLog(["FAILED: " + message]);
    return { $error: { message } };
  }

  if (result.$error) {
    console.warn(result);
    setLog(["FAILED: " + result.$error.message]);
    return result;
  }

  if (REQUIRE_REGISTRATION) {
    // @ts-expect-error: TODO
    const _id = db.auth.userId;
    // TODO, _update should allow mongo modifier
    const users = db.collection("users");
    const user = users.findOne({ _id });
    if (!user) throw new Error("no user");
    if (!result.credits) throw new Error("no result.credits");
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

    const BANANA_API_URL = bananaUrl(callInputs.PROVIDER_ID);
    console.log({ BANANA_API_URL });

    let response;
    try {
      response = await fetch(BANANA_API_URL + "/check/v4/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Unknown error";
      setLog(["FAILED: " + message]);
      return { $error: { message } };
    }

    const text = await response.text();
    try {
      result = JSON.parse(text);
    } catch (error) {
      console.error(error);
      console.error(text);
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

export default async function bananaFetch(
  api_path: string,
  model_inputs: ModelInputs,
  call_inputs: CallInputs,
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
  //console.log("runner", dest, runner);
  console.log({ model_inputs, call_inputs });
  const modelInputs = stableDiffusionInputsSchema.cast(model_inputs);
  const callInputs = bananaCallInputsSchema.cast(call_inputs);

  if (typeof modelInputs.MODEL_ID === "string") {
    callInputs.MODEL_ID = modelInputs.MODEL_ID;
    delete modelInputs.MODEL_ID;
  }

  const result = await runner(api_path, modelInputs, callInputs, {
    setLog,
    setImgSrc,
    dest,
    auth,
    MODEL_NAME,
  });

  console.log(result);
  return result;
}
