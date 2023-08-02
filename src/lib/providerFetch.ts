/*
 * Isomorphic abstraction around various providers and browser/server.
 *
 * A single async call can be made on the browser to return the result.
 * Depending on the Provider API selected, this may involve transparently
 * passing the request to a serverless API to execute the request, and
 * start/check(status) requests, and user-defined hooks, in the interim.
 */

import { v4 as uuidv4 } from "uuid";
import { NextApiRequest, NextApiResponse } from "next";

import providers, {
  Provider,
  ProviderServerless,
  apiInfo,
} from "../config/providers";

import hooks from "./hooks";
import "../../src/hooks/providerFetch";
import { ddaCallInputs } from "../schemas";
import { Model, getModel } from "./models";

export type hookName = "providerFetch.server.preStart";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function oldBananaKeys(request: ProviderFetchRequestBase) {
  const callInputs = request.inputs?.callInputs as ddaCallInputs;
  if (!callInputs) return;
  if (request.provider.id !== "banana") return;

  console.log("oldBananaKeys", callInputs);
  let envName = "BANANA_MODEL_KEY_SD";
  switch (callInputs.MODEL_ID) {
    case "stabilityai/stable-diffusion-2-1-base":
      envName += "_v2_1_512";
      break;
    case "stabilityai/stable-diffusion-2-1":
      envName += "_v2_1_768";
      break;
    case "stabilityai/stable-diffusion-2-base":
      envName += "_v2_0_512";
      break;
    case "stabilityai/stable-diffusion-2":
      envName += "_v2_0_768";
      break;
    case "CompVis/stable-diffusion-v1-4":
      envName += "_v1_4";
      break;
    case "runwayml/stable-diffusion-v1-5":
      envName += "_v1_5";
      break;
    case "runwayml/stable-diffusion-inpainting":
      envName += "_INPAINT";
      break;
    case "hakurei/waifu-diffusion":
      envName += "_WAIFU";
      break;
    case "hakurei/waifu-diffusion-v1-3":
      envName += "_WAIFU_v1_3";
      callInputs.CHECKPOINT_URL =
        "https://huggingface.co/hakurei/waifu-diffusion-v1-3/resolve/main/wd-v1-3-float16.ckpt";
      break;
    case "hakurei/waifu-diffusion-v1-3-full":
      envName += "_WAIFU_v1_3_full";
      callInputs.MODEL_ID = "hakurei/waifu-diffusion-v1-3";
      break;
    case "wd-1-4-anime_e1":
      envName += "_WAIFU_v1_3_e1";
      break;
    case "Linaqruf/anything-v3.0":
      envName += "_ANYTHING_v3_0";
      break;
    case "rinna/japanese-stable-diffusion":
      envName += "_JP";
      break;
    default:
      return;
  }
  const value = process.env[envName];
  if (value) {
    console.warn("WARNING: Still using old banana model keys");
    return value;
  }
}

// TODO, make this all internal to providerFetch
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

export interface ProviderFetchRequestObject {
  id?: string;
  providerId: string;
  modelId: string;
  inputs: Record<string, unknown>;
  modelOutputs?: Record<string, unknown> | null;
  callID?: string;
  finished?: boolean;
  message?: string;
}

export class ProviderFetchRequestBase {
  provider: Provider;
  model: Model;
  inputs: Record<string, unknown>;
  id: string;

  callID = "";
  finished = false;
  modelOutputs?: Record<string, unknown>[] | null = null;
  message = "";

  constructor(
    provider: Provider,
    model: Model,
    inputs: Record<string, unknown>,
    id?: string
  ) {
    this.provider = provider;
    this.model = model;
    this.inputs = inputs;
    this.id = id || uuidv4();
  }

  async checkInputs() {
    let model = this.model;

    if (this.inputs.callInputs) {
      const use_extra =
        // @ts-expect-error: ok
        this.model.id === "dda" && this.inputs.callInputs.use_extra;
      if (use_extra) {
        const maybeModel = getModel(use_extra);
        if (maybeModel) model = maybeModel;
      }

      const schema = model.callInputsSchema;
      if (schema) await schema.validate(this.inputs.callInputs);
    }
    if (this.inputs.modelInputs) {
      const schema = model.modelInputsSchema;
      if (schema) await schema.validate(this.inputs.modelInputs);
    }
  }

  apiInfo() {
    return apiInfo[this.provider.api];
  }

  prepareStart() {
    if (this.apiInfo().streamable) {
      if (this.inputs.callInputs) {
        // @ts-expect-error: ok
        this.inputs.callInputs.streamEvents = true;
      }
    }

    return {
      url: this.provider.apiUrl || "NO_PROVIDER_URL_DEFINED",
      payload: this.inputs,
    };
  }

  prepareCheck() {
    return {
      url: this.provider.apiUrl || "NO_PROVIDER_URL_DEFINED",
      payload: { callID: this.callID },
    };
    throw new Error("prepareCheck() was called without being overriden");
  }

  async handleResponse(
    response: Response,
    callback?: (result: Record<string, unknown>) => void
  ) {
    if (response.headers.get("content-type") === "application/x-ndjson") {
      return await new Promise((resolve, reject) => {
        if (!response.body) return reject("no response.body");
        const textDecoder = new TextDecoder();
        const reader = response.body.getReader();
        let lastResult: Record<string, unknown> | null = null;
        let buffer = "";
        reader.read().then(function processValue({ done, value }): void {
          if (done) {
            resolve(lastResult);
            return;
          }

          const str = textDecoder.decode(value);
          buffer += str;

          const parts = buffer.split("\n");
          const last = parts.pop();

          // if (last !== "") it means its the chunk did not end on newline
          // and is still unfinished (will continue on next chunk)
          if (last !== undefined && last !== "") buffer = last;
          else buffer = "";

          let result;
          for (const part of parts) {
            try {
              result = JSON.parse(part);
            } catch (error) {
              console.warn(error);
              console.log(part);
              reject(error);
              return;
            }
            lastResult = result;
            // console.log("result", result, callback);
            if (callback) callback(result);
          }

          reader.read().then(processValue);
          return;
        });
      });
    } else {
      return await response.json();
    }
  }

  async fetchSingle(callback?: (result: Record<string, unknown>) => void) {
    await this.checkInputs();

    const { url, payload } = this.prepareStart();

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    return await this.handleResponse(response, callback);
  }

  async fetchStart() {
    const { url, payload } = this.prepareStart();

    const truncatedPayload = JSON.parse(JSON.stringify(payload));
    const tpmi = truncatedPayload.modelInputs.modelInputs;
    if (tpmi)
      for (const key of ["image", "input_image", "mask_image"])
        if (tpmi[key])
          tpmi[key] =
            tpmi[key].substring(0, 5) +
            "...[truncated]..." +
            tpmi[key].substring(tpmi[key].length - 5);

    console.log("fetchStart", url, truncatedPayload);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    let result;
    try {
      result = JSON.parse(text);
    } catch (error) {
      this.callID = "unknown";
      this.finished = true;
      this.modelOutputs = null;
      this.message = "Error: " + text;
      return { message: this.message };
    }
    console.log("fetchStart result", result);

    this.callID = result.callID;
    this.finished = result.finished;
    this.modelOutputs == result.modelOutputs;
    this.message = result.message;

    return result;
  }

  async browserStart() {
    if (this.apiInfo().startViaServer) {
      const extraInfo = await hooks.exec(
        "providerFetch.browser.extraInfoToSend"
      );

      const response = await fetch("/api/providerFetch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "start",
          requestObject: this.toObject(),
          extraInfo,
        }),
      });

      if (response.status !== 200) {
        // NB: messages with "error" in it are handled differently.
        const bodyText = await response.text();
        this.callID = "unknown";
        this.message =
          "Error: " +
          JSON.stringify({
            $error: {
              status: response.status,
              body: bodyText,
            },
          });
        this.modelOutputs = null;
        this.finished = true;
        return {
          message: this.message,
        };
      }

      const result = await response.json();
      // console.log("browserStart result", result);

      this.callID = result.callID;
      this.modelOutputs = result.modelOutputs;
      this.message = result.message;
      this.finished = result.finished;
      return result;
    } else {
      return await this.fetchStart();
    }
  }

  async check(callback?: (result: Record<string, unknown>) => void) {
    const { url, payload } = this.prepareCheck();

    console.log("check", url, payload);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    // const result = await response.json();
    const result = await this.handleResponse(response, callback);
    console.log("check result", result);

    // this.callID = result.callID;  don't reset
    this.message = result.message;
    if (result.finished !== undefined) this.finished = result.finished;
    else this.finished = result.message !== "" && result.message !== "running";
    this.modelOutputs = result.modelOutputs;

    if (this.message) return result;
  }

  async checkUntilResult(callback?: (result: Record<string, unknown>) => void) {
    while (!this.finished) {
      await this.check(callback);
      // TODO, different sleep time for longPoll or not.
      await sleep(333);
    }
    return this;
  }

  async checkBrowser() {
    if (this.apiInfo().checkViaServer) {
      const response = await fetch("/api/providerFetch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "check",
          requestObject: this.toObject(),
        }),
      });

      const result = await response.json();
      // console.log("browserStart result", result);

      this.callID = result.callID;
      this.modelOutputs = result.modelOutputs;
      this.message = result.message;
      this.finished = result.finished;
      return result;
    } else {
      return await this.check();
    }
  }

  toObject() {
    return {
      id: this.id,
      providerId: this.provider.id,
      modelId: this.model.id,
      inputs: this.inputs,

      callID: this.callID,
      finished: this.finished,
      modelOutputs: this.modelOutputs,
      message: this.message,
    } as ProviderFetchRequestObject;
  }

  static fromObject(object: ProviderFetchRequestObject, createId = false) {
    const id = createId ? undefined : object.id;
    if (!(id || createId))
      throw new Error("fromObject(obj) but `obj` has no `id` field");

    const provider = providers.find((p) => p.id === object.providerId);
    if (!provider) throw new Error("Invalid providerId: " + object.providerId);

    const model = getModel(object.modelId);

    const ProviderFetchRequest = ProviderFetchRequestByApi[provider.api];
    if (!ProviderFetchRequest) throw new Error("Invalid API: " + provider.api);

    const providerFetchRequest = new ProviderFetchRequest(
      provider,
      model,
      object.inputs,
      id
    );

    providerFetchRequest.callID = object.callID || "";
    providerFetchRequest.finished = object.finished || false;
    providerFetchRequest.message = object.message || "";

    return providerFetchRequest;
  }
}

class ProviderFetchRequestBanana extends ProviderFetchRequestBase {
  prepareStart() {
    const provider = this.provider as ProviderServerless;

    // Present on "banana+kiri" API.
    if (this.apiInfo().streamable) {
      if (this.inputs.callInputs) {
        // @ts-expect-error: ok
        this.inputs.callInputs.streamEvents = true;
      }
    }

    const url = provider.apiUrl + "/start/v4/";

    const apiKey = provider.apiKey || process.env["BANANA_API_KEY"];
    if (!apiKey) throw new Error("BANANA_API_KEY is not set");

    const modelKey = (() => {
      const key = "BANANA_MODEL_KEY_" + this.model.id.toUpperCase();
      /*
      this.model.modelKeys?.["banana"] ||
      process.env[
        "BANANA_MODEL_KEY_" +
          this.MODEL_ID.toUpperCase().replace(/\//, "_")
      ] ||
      */
      return process.env[key] || oldBananaKeys(this) || this.model.id;
    })();

    const payload = {
      id: this.id,
      created: Math.floor(Date.now() / 1000),
      apiKey,
      modelKey,
      modelInputs: this.inputs,
      startOnly: true,
    };

    return { url, payload };
  }

  prepareCheck() {
    const url = this.provider.apiUrl + "/check/v4/";

    const payload = {
      id: uuidv4(),
      created: Math.floor(Date.now() / 1000),
      // longPoll: false, // <-- main reason we can't use banana-node-sdk
      longPoll: true,
      callID: this.callID,
    };

    return { url, payload };
  }
}

export const ProviderFetchRequestByApi = {
  direct: ProviderFetchRequestBase,
  banana: ProviderFetchRequestBanana,
  runpod: ProviderFetchRequestBase, // TODO
  "banana+kiri": ProviderFetchRequestBanana,
};

export class ProviderFetchServerless {
  express(deps?: Record<string, unknown>) {
    return async function serverless(
      req: NextApiRequest,
      res: NextApiResponse
    ) {
      if (req.method !== "POST")
        return res
          .status(400)
          .end("Bad Request: Expected POST, not " + req.method);

      const type = req.body.type;
      if (type !== "start" && type != "check")
        return res
          .status(400)
          .end(
            `Bad Request: \`type\` should be "start" or "check", not "${type}"`
          );

      const request = ProviderFetchRequestBase.fromObject(
        req.body.requestObject
      );

      await request.checkInputs();

      const extraInfo = req.body.extraInfo;
      // console.log("req.body", req.body);
      // console.log("request", request);

      if (type === "start") {
        const preStartResult: Record<string, unknown> = await hooks.exec(
          "providerFetch.server.preStart",
          {
            request,
            extraInfo,
            deps,
            req,
          }
        );

        const $response = preStartResult.$response as
          | undefined
          | Record<string, unknown>;
        if ($response)
          return res.status($response.status as number).end($response.body);

        const $error = preStartResult.$error as
          | undefined
          | Record<string, unknown>;
        if ($error) return res.status(200).end({ $error });

        // try/catch?  handle non-200?
        // startResult: { statusCode: 413, code: 'FST_ERR_CTP_BODY_TOO_LARGE', error: 'Payload Too Large', message: 'Request body is too large' }
        const startResult = await request.fetchStart();

        await hooks.exec("providerFetch.server.postStart", {
          request,
          extraInfo,
          deps,
          preStartResult,
          startResult,
        });

        return res.status(200).end(JSON.stringify(request.toObject()));
      } else {
        return res.status(400).end("Bad Request: CHECK not implemented yet");
      }
    };
  }
}

export default async function providerFetch(
  providerId: string,
  modelId: string,
  inputs: Record<string, unknown>,
  callback?: (result: Record<string, unknown>) => void
) {
  const obj = { providerId, modelId, inputs };
  const request = ProviderFetchRequestBase.fromObject(obj, true);
  // console.log(obj);
  // console.log(request);

  // TODO, dda specific... need to refactor
  // @ts-expect-error: TODO
  if (inputs.callInputs) inputs.callInputs.startRequestId = request.id;

  if (typeof window === "object") {
    if (request.apiInfo().oneshot) {
      let result;
      try {
        result = await request.fetchSingle(callback);
      } catch (error) {
        if (error instanceof Error) {
          return {
            message: "error",
            $error: {
              name: error.name,
              message: error.message,
              stack: error.stack,
            },
          };
        } else {
          return {
            message: "error",
            error: JSON.stringify(error),
          };
        }
      }
      return {
        message: "success",
        modelOutputs: [result],
      };
    } else {
      const startResult = await request.browserStart();
      if (!startResult.callID || startResult.message) {
        return {
          message: startResult.message,
        };
      }
      // console.log(request);

      const result = await request.checkUntilResult(callback);
      console.log("providerFetch result", result);

      if (!request.apiInfo().checkViaServer) {
        const callID = result.callID;
        const now = Date.now(); // result.created * 1000
        if (result.modelOutputs?.length) {
          updateFinishedStep(callID, now, { $success: true });
        } else {
          updateFinishedStep(callID, now, {
            $error: {
              message: result.message,
              modelOutputs: result.modelOutputs,
            },
          });
        }
      }

      return result;
    }
  } else {
    // untested
    // const start = await request.fetchStart();
    // console.log(start);
    throw new Error("calling providerFetch from server not implemented yet");
  }
}
