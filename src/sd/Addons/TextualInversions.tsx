import React from "react";

import { Chip, Typography } from "@mui/material";
import { FilterAlt } from "@mui/icons-material";

import type { ModelVersion } from "../../lib/civitai";
import { ModelState } from "../useModelState";
import { AddedModel, Models } from "./common";

function getTokenFromModelVersion(modelVersion: ModelVersion) {
  // No!  These are often wrong.
  // modelVersion.trainedWords?.[0]

  let file;
  for (const f of modelVersion.files) if (f.primary) file = f;
  if (!file) file = modelVersion.files[0];

  const token = file.name.replace(/\..*$/, "");
  return [token];
}

export default function TextualInversion({
  inputs,
  setTextualInversions,
}: {
  inputs: ModelState;
  setTextualInversions: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const [added, setAdded] = React.useState<AddedModel[]>([]);
  console.log({ added });

  React.useEffect(() => {
    const textualInversions = added.map(({ model, versionIndex }) => {
      const modelVersion = model.modelVersions[versionIndex];

      let file;
      for (const f of modelVersion.files) if (f.primary) file = f;
      if (!file) file = modelVersion.files[0];

      return (
        file.downloadUrl +
        "#fname=" +
        file.name +
        "&token=" +
        getTokenFromModelVersion(model.modelVersions[versionIndex])
      );
      // modelVersion.trainedWords?.[0]
    });

    console.log(textualInversions);
    setTextualInversions(textualInversions);
  }, [added, setTextualInversions]);

  return (
    <div>
      <Typography variant="h6">Textual Inversions</Typography>
      <p style={{ fontSize: "80%" }}>
        Browse <a href="https://civitai.com/">CivitAI</a> and{" "}
        <FilterAlt
          sx={{ verticalAlign: "middle", color: "#888" }}
          fontSize="small"
        />{" "}
        filter for{" "}
        <Chip size="small" sx={{ fontSize: "80%" }} label="Textual Inversion" />{" "}
        models.
      </p>
      <Models
        added={added}
        setAdded={setAdded}
        inputs={inputs}
        requiredType="TextualInversion"
        getTokens={getTokenFromModelVersion}
      />
      <p style={{ fontSize: "70%" }}>
        Note: currently, once a token has been added to a model by any user, it
        cannot be removed until a new model is loaded. This means it is
        currently not possible to easily update a token with a newer version of
        the embedding. For most users, this is unlikely to be an issue.
      </p>
    </div>
  );
}
