import type { ModelVersion } from "../../lib/civitai";
import { ModelState } from "../useModelState";
import { AddedModel } from "./common";

export function getTokensFromModelVersion(modelVersion: ModelVersion) {
  return modelVersion.trainedWords || [];
}

export const MAX_LENGTH = 1;

export function onChange(
  added: AddedModel[],
  inputs: ModelState,
  setPromptLoras: (
    loras: Record<string, { scale: number; str: string }>
  ) => void
) {
  const promptLoras = (function () {
    const loras: Record<string, { scale: number; str: string }> = {};
    const matches1 = inputs.prompt.value.matchAll(
      /<lora:(?<lora>[^:]+):(?<scale>[0-9.]+)>/g
    );
    const matches2 = inputs.prompt.value.matchAll(
      /(with|use)Lora\((?<lora>[^,]+),(?<scale>[0-9.]+)\)/g
    );
    for (const matches of [matches1, matches2])
      for (const match of matches) {
        if (!match.groups) continue;
        const lora = match.groups.lora;
        const scale = parseFloat(match.groups.scale);
        const str = match[0];
        loras[lora] = { scale, str };
      }
    return loras;
  })();
  setPromptLoras(promptLoras);

  const loraWeights = added
    .filter(({ model }) => model.type === "LORA")
    // @ts-expect-error: scale totally exists after the filter
    .map(({ model, versionIndex, scale }) => {
      const modelVersion = model.modelVersions[versionIndex];

      let file;
      for (const f of modelVersion.files) if (f.primary) file = f;
      if (!file) file = modelVersion.files[0];
      const part = file.name.replace(/\.(safetensors|pt)$/, "");

      return (
        file.downloadUrl +
        "#fname=" +
        file.name +
        "&scale=" +
        (promptLoras[part] ? promptLoras[part].scale : scale)
      );
    });

  if (
    JSON.stringify(loraWeights) !== JSON.stringify(inputs.lora_weights.value)
  ) {
    console.log(loraWeights);
    inputs.lora_weights.setValue(loraWeights);
  }
}
