import { v4 as uuidv4 } from "uuid";

import { Model, getModel } from "../models";
import { Provider, apiInfo } from "../../config/providers";
import hooks from "../hooks";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface ProviderFetchRequestObject {
  id?: string;
  providerId: string;
  modelId: string;
  inputs: Record<string, unknown>;
  modelOutputs?: Record<string, unknown> | null;
  callID?: string;
  finished?: boolean;
  message?: string;
  $extra?: Record<string, unknown>;
}

export default class ProviderFetchRequestBase {
  provider: Provider;
  model: Model;
  inputs: Record<string, unknown>;
  id: string;

  callID = "";
  finished = false;
  modelOutputs?: Record<string, unknown>[] | null = null;
  message = "";

  $extra: Record<string, unknown> | undefined;
  queuePriority = 2;

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

  async browserStart(callback?: (result: Record<string, unknown>) => void) {
    if (this.apiInfo().startViaServer) {
      const extraInfo = await hooks.exec(
        "providerFetch.browser.extraInfoToSend"
      );

      const url = this.apiInfo().startOnly ? "/api/providerFetch" : "/api/kiri";
      const response = await fetch(url, {
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateThisFromResult = (result: any) => {
        this.callID = result.callID;
        this.modelOutputs = result.modelOutputs;
        this.message = result.message;
        this.finished = result.finished;
        this.$extra = result.$extra;
      };

      if (!this.apiInfo().startOnly) {
        let isFirst = true;
        const callbackAndFirstResponse = async (
          result: Record<string, unknown>
        ) => {
          if (isFirst) {
            isFirst = false;
            updateThisFromResult(result);
            await hooks.exec("providerFetch.browser.postStart", {
              request: this,
            });
            return;
          }
          callback && callback(result);
        };

        const result = await this.handleResponse(
          response,
          callbackAndFirstResponse
        );

        // this.callID = result.callID;  don't reset
        this.message = result.message;
        if (result.finished !== undefined) this.finished = result.finished;
        else
          this.finished = result.message !== "" && result.message !== "running";
        this.modelOutputs = result.modelOutputs;

        if (this.message) return result;
        return;
      }

      const result = await response.json();
      // console.log("browserStart result", result);
      updateThisFromResult(result);
      await hooks.exec("providerFetch.browser.postStart", { request: this });

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
      $extra: this.$extra,
      queuePriority: this.queuePriority,
    } as ProviderFetchRequestObject;
  }
}
