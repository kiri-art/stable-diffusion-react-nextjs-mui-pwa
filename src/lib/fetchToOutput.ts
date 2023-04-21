/*
 * Wraps providerFetch (which handles the raw data transport) to
 * handle site specific requirements: ensuring "inputs" are in
 * the format expected by docker-diffusers-api, error handling,
 * and drawing the output image.
 *
 */

import providerFetch from "./providerFetch";
import { db } from "gongo-client-react";
import isBlackImgBase64 from "./isBlackImgBase64";
import { getModel } from "./models";

const History = typeof window === "object" && db.collection("history");

interface ErrorJSON {
  code: string;
  name: string;
  message: string;
  stack: string;
}

// TODO, much more work here... can refactor nicely to cover all pages, but
// as a first step, let's have it work with only small changes needed to
// existing pages.  So use our existing "txt2img" API.
export default async function fetchToOutput(
  MODEL_ID: string,
  model_inputs: Record<string, unknown>,
  call_inputs: Record<string, unknown>,
  {
    setLog,
    setImgSrc,
    setNsfw,
    setHistoryId,
    dest,
    auth,
    MODEL_NAME,
  }: {
    setLog: (log: string[]) => void;
    setImgSrc: React.Dispatch<React.SetStateAction<string>>;
    setNsfw: React.Dispatch<React.SetStateAction<boolean>>;
    setHistoryId: React.Dispatch<React.SetStateAction<string>>;
    dest: string; // "exec" | "banana-local" | "banana-remote";
    auth?: Record<string, unknown>;
    MODEL_NAME?: string;
  }
) {
  try {
    console.log({ model_inputs, call_inputs });

    const model = getModel(MODEL_ID);
    const modelInputs = model.modelInputsSchema
      ? model.modelInputsSchema.cast(model_inputs)
      : model_inputs;
    const callInputs = model.callInputsSchema
      ? model.callInputsSchema.cast(call_inputs)
      : call_inputs;

    // @ts-expect-error: TODO
    if (model.prepareInputs) model.prepareInputs(callInputs, modelInputs);
    /*
  const modelInputs = { ...model_inputs };
  const callInputs = { ...call_inputs };

  const MODEL_ID = modelInputs.MODEL_ID as string;
  callInputs.MODEL_ID = modelInputs.MODEL_ID;
  delete modelInputs.MODEL_ID;

  const PROVIDER_ID = (modelInputs.PROVIDER_ID as number).toString();
  delete modelInputs.PROVIDER_ID;

  delete modelInputs.randomizeSeed;
  delete modelInputs.shareInputs;
  callInputs.safety_checker = modelInputs.safety_checker;
  delete modelInputs.safety_checker;
  delete modelInputs.sampler;
  */

    /*
    modelInputs: {
      ...modelInputs,
      prompt: inputs.prompt.value || randomPrompt,
      seed,
    },
    callInputs: {
      PIPELINE,
      SCHEDULER,
      MODEL_ID,
      MODEL_URL: "s3://",
    */

    if (0) {
      console.log("modelInputs", modelInputs);
      console.log("callInputs", callInputs);
      return;
    }

    const PROVIDER_ID = callInputs.PROVIDER_ID.toString();
    // const MODEL_ID = "dda"; // TODO callInputs.MODEL_ID as string;

    setLog([]);

    const result = await providerFetch(
      PROVIDER_ID,
      MODEL_ID,
      {
        modelInputs,
        callInputs,
      },
      function (data) {
        // console.log("data", data);
        if (!(data.$error || data.$timings)) {
          // console.log("status");
          if (data.status === "start")
            setLog(["Starting " + data.type + "..."]);
          else if (data.progress) {
            setLog([
              "Starting " +
                data.type +
                "... " +
                (data?.progress &&
                  Math.round((data.progress as number) * 100)) +
                "%",
            ]);
          }
        }
      }
    );

    console.log(result);

    if (!result) {
      // do something
      console.error("no result");
      return;
    }

    if (result.message.match(/error/)) {
      setLog(["FAILED: " + result.message]);
      console.error(result);
      // return { $error: result };
    }

    if (!result.modelOutputs) {
      // do something
      console.error("no modelOutputs");
      return;
    }

    const output1 = result.modelOutputs[0];

    if (!output1) {
      // do something
      console.error("no output1");
      return;
    }

    const $error = output1.$error as undefined | ErrorJSON;
    if ($error) {
      // do something
      console.error($error);
      const logOutput = JSON.stringify($error, null, 2).split("\n");
      logOutput.push("");
      if ($error.stack)
        for (const line of $error.stack.split("\n")) logOutput.push(line);
      setLog(logOutput);
      return;
    }

    const imgBase64 = output1.image_base64 as undefined | string;
    if (!imgBase64) {
      // do something
      console.error("no imgBase64");
      return;
    }

    const buffer = Buffer.from(imgBase64, "base64");
    const blob = new Blob([buffer], { type: "image/png" });
    const objectURL = URL.createObjectURL(blob);
    setImgSrc(objectURL);
    setLog([]);

    /*
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
    */

    if (isBlackImgBase64(imgBase64)) {
      console.log("NSFW");
      // result.$success._NSFW = true;
      setNsfw(true);
    } else {
      setNsfw(false);
    }

    if (History /* && result?.$success */) {
      //console.log({
      const inserted = History.insert({
        date: new Date(),
        modelInputs,
        callInputs,
        // result: result.$success,
        result: {
          // _id: "63494bddfbd5a250ee242b1e"
          // apiVersion: "local dev",
          // created: 1665747926,
          // credits: {free: 959.8, paid: 50},
          // id: "UID todo",
          // message: "success"
          // modelOutputs: [{…}]
          modelOutputs: [output1],
        },
      });

      // result.historyId = inserted._id;
      // setHistoryId(result.historyId);
      setHistoryId(inserted._id as string);
    }
  } catch (error) {
    console.error(error);

    if (error instanceof Error) {
      setLog(
        JSON.stringify(
          {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
          null,
          2
        ).split("\n")
      );
    } else {
      setLog([JSON.stringify(error)]);
    }
  }
}
