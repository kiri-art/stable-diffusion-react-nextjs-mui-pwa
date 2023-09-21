import { v4 as uuidv4 } from "uuid";

import type { ProviderServerless } from "../../config/providers";
import ProviderFetchRequestBase from "./ProviderFetchRequestBase";
import { ddaCallInputs } from "../../schemas";

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

export default class ProviderFetchRequestBanana extends ProviderFetchRequestBase {
  prepareStart() {
    const provider = this.provider as ProviderServerless;
    if (!provider.apiKey)
      console.warn("Warning, provider apiKey not set for: " + provider.id);

    const apiInfo = this.apiInfo();

    // Present on "banana+kiri" API.
    if (apiInfo.streamable) {
      if (this.inputs.callInputs) {
        // @ts-expect-error: ok
        this.inputs.callInputs.streamEvents = true;
      }
    }

    const url = provider.apiUrl + "/start/v4/";

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

    const payload: Record<string, unknown> = {
      id: this.id,
      created: Math.floor(Date.now() / 1000),
      apiKey: provider.apiKey,
      modelKey,
      modelInputs: this.inputs,
      startOnly: apiInfo.startOnly ?? true,
      $extra: this.$extra,
    };

    if (apiInfo.priorityQueues) payload.queuePriority = this.queuePriority;

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
