import React from "react";

import { Chip, Typography } from "@mui/material";
import { FilterAlt } from "@mui/icons-material";

import { ModelState } from "../useModelState";
import { AddedModel, Models } from "./common";

export default function LoRAs({
  setLoraWeights,
  inputs,
}: {
  setLoraWeights: React.Dispatch<React.SetStateAction<string[]>>;
  inputs: ModelState;
}) {
  setLoraWeights;
  const [added, setAdded] = React.useState<AddedModel[]>([]);

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
        requiredType="TextualInversion"
        Additional={() => null}
      />

      <p>Working on this next!</p>
    </div>
  );
}
