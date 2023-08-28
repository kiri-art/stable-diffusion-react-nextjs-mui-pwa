import type { ModelVersion } from "../../lib/civitai";
import { ModelState } from "../useModelState";
import { AddedModel } from "./common";

export const MAX_LENGTH = null;

export function getTokensFromModelVersion(modelVersion: ModelVersion) {
  // No!  These are often wrong.
  // modelVersion.trainedWords?.[0]

  let file;
  for (const f of modelVersion.files) if (f.primary) file = f;
  if (!file) file = modelVersion.files[0];

  const token = file.name.replace(/\..*$/, "");
  return [token];
}

export function onChange(added: AddedModel[], inputs: ModelState) {
  const textualInversions = added
    .filter(({ model }) => model.type === "TextualInversion")
    .map(({ model, versionIndex }) => {
      const modelVersion = model.modelVersions[versionIndex];

      let file;
      for (const f of modelVersion.files) if (f.primary) file = f;
      if (!file) file = modelVersion.files[0];

      return (
        file.downloadUrl +
        "#fname=" +
        file.name +
        "&token=" +
        getTokensFromModelVersion(model.modelVersions[versionIndex])
      );
      // modelVersion.trainedWords?.[0]
    });

  if (
    JSON.stringify(textualInversions) !==
    JSON.stringify(inputs.textual_inversions.value)
  ) {
    console.log(textualInversions);
    inputs.textual_inversions.setValue(textualInversions);
  }
}
