import React from "react";

import { Chip, Typography } from "@mui/material";
import { FilterAlt } from "@mui/icons-material";

import type { ModelVersion } from "../../lib/civitai";
import { ModelState } from "../useModelState";
import { AddedModel, Models } from "./common";

function getTokens(modelVersion: ModelVersion) {
  return modelVersion.trainedWords || [];
}

export default function LoRAs({
  setLoraWeights,
  inputs,
}: {
  setLoraWeights: React.Dispatch<React.SetStateAction<string[]>>;
  inputs: ModelState;
}) {
  setLoraWeights;
  const [added, setAdded] = React.useState<AddedModel[]>([]);
  const [promptLoras, setPromptLoras] = React.useState<
    Record<string, { scale: number; str: string }>
  >({});

  React.useEffect(() => {
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

    console.log(loraWeights);
    setLoraWeights(loraWeights);
  }, [added, setLoraWeights, promptLoras]);

  React.useEffect(() => {
    const loras: Record<string, { scale: number; str: string }> = {};
    const matches = inputs.prompt.value.matchAll(
      /<lora:(?<lora>[^:]+):(?<scale>[0-9.]+)>/g
    );
    for (const match of matches) {
      if (!match.groups) continue;
      const lora = match.groups.lora;
      const scale = parseFloat(match.groups.scale);
      const str = match[0];
      loras[lora] = { scale, str };
    }
    setPromptLoras(loras);
  }, [inputs.prompt.value]);

  return (
    <div>
      <Typography variant="h6">LoRAs</Typography>

      <p style={{ fontSize: "80%" }}>
        Browse <a href="https://civitai.com/">CivitAI</a> and{" "}
        <FilterAlt
          sx={{ verticalAlign: "middle", color: "#888" }}
          fontSize="small"
        />{" "}
        filter for <Chip size="small" sx={{ fontSize: "80%" }} label="LoRA" />{" "}
        models.
      </p>
      <Models
        added={added}
        setAdded={setAdded}
        inputs={inputs}
        requiredType="LORA"
        getTokens={getTokens}
        maxLength={1}
        promptLoras={promptLoras}
      />

      <p style={{ fontSize: "70%" }}>
        Note: currently, only one LoRA can be used at a time (tracked upstream
        at{" "}
        <a href="https://github.com/huggingface/diffusers/issues/2613">
          diffusers#2613
        </a>
        ).
      </p>
    </div>
  );
}
