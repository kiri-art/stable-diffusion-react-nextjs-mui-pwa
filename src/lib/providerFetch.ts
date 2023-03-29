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

import models, { Model } from "../config/models";
import providers, {
  Provider,
  ProviderServerless,
  apiInfo,
} from "../config/providers";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface ProviderFetchRequestObject {
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
    inputs: Record<string, unknown>
  ) {
    this.provider = provider;
    this.model = model;
    this.inputs = inputs;
    this.id = uuidv4();
  }

  apiInfo() {
    return apiInfo[this.provider.api];
  }

  prepareStart() {
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

  async fetchStart() {
    const { url, payload } = this.prepareStart();

    console.log("fetchStart", url, payload);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    console.log("fetchStart result", result);

    this.callID = result.callID;
    this.finished = result.finished;
    this.modelOutputs == result.modelOutputs;
    this.message = result.message;

    return result;
  }

  async browserStart() {
    if (this.apiInfo().startViaServer) {
      const response = await fetch("/api/providerFetch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "start",
          requestObject: this.toObject(),
        }),
      });

      const result = await response.json();
      console.log("browserStart result", result);

      this.callID = result.callID;
      this.modelOutputs = result.modelOutputs;
      this.message = result.message;
      this.finished = result.finished;
      return result;
    } else {
      return await this.fetchStart();
    }
  }

  async check() {
    const { url, payload } = this.prepareCheck();

    console.log("check", url, payload);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();
    console.log("check result", result);

    this.callID = result.callID;
    this.message = result.message;
    this.finished = result.finished;
    this.modelOutputs = result.modelOutputs;

    /*
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
  */

    return result;
  }

  async checkUntilResult() {
    while (!this.finished) {
      await this.check();
      await sleep(1000);
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
      console.log("browserStart result", result);

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
      providerId: this.provider.id,
      modelId: this.model.MODEL_ID,
      inputs: this.inputs,

      callID: this.callID,
      finished: this.finished,
      modelOutputs: this.modelOutputs,
      message: this.message,
    } as ProviderFetchRequestObject;
  }

  static fromObject(object: ProviderFetchRequestObject) {
    const provider = providers.find((p) => p.id === object.providerId);
    if (!provider) throw new Error("Invalid providerId: " + object.providerId);

    const model = models[object.modelId];
    if (!provider) throw new Error("Invalid model: " + object.modelId);

    const ProviderFetchRequest = ProviderFetchRequestByApi[provider.api];
    if (!ProviderFetchRequest) throw new Error("Invalid API: " + provider.api);

    const providerFetchRequest = new ProviderFetchRequest(
      provider,
      model,
      object.inputs
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

    const url = provider.apiUrl + "/start/v4/";

    const apiKey = provider.apiKey || process.env["BANANA_API_KEY"];
    if (!apiKey) throw new Error("BANANA_API_KEY is not set");

    const modelKey =
      this.model.modelKeys?.["banana"] ||
      process.env[
        "BANANA_MODEL_KEY_" +
          this.model.MODEL_ID.toUpperCase().replace(/\//, "_")
      ] ||
      "dda";

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
      longPoll: false, // <-- main reason we can't use banana-node-sdk
      callID: this.callID,
    };

    return { url, payload };
  }
}

export const ProviderFetchRequestByApi = {
  direct: ProviderFetchRequestBase,
  banana: ProviderFetchRequestBanana,
  runpod: ProviderFetchRequestBase, // TODO
};

export class ProviderFetchServerless {
  express() {
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
      console.log("req.body", req.body);
      console.log("request", request);

      if (type === "start") {
        await request.fetchStart();
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
  inputs: Record<string, unknown>
) {
  const obj = { providerId, modelId, inputs };
  const request = ProviderFetchRequestBase.fromObject(obj);
  console.log(obj);
  console.log(request);

  if (typeof window === "object") {
    await request.browserStart();
    console.log(request);

    const result = await request.checkUntilResult();
    console.log("providerFetch result", result);
    return result;
  } else {
    // untested
    const start = await request.fetchStart();
    console.log(start);
  }
}
