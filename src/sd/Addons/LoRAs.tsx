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

  React.useEffect(() => {
    const loraWeights = added.map(({ model, versionIndex }) => {
      const modelVersion = model.modelVersions[versionIndex];

      let file;
      for (const f of modelVersion.files) if (f.primary) file = f;
      if (!file) file = modelVersion.files[0];

      return file.downloadUrl + "#fname=" + file.name;
    });

    console.log(loraWeights);
    setLoraWeights(loraWeights);
  }, [added, setLoraWeights]);

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
