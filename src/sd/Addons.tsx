import React from "react";

import { Box, Chip, Container } from "@mui/material";
import { FilterAlt } from "@mui/icons-material";

import type { ModelState } from "./useModelState";
import { AddedModel, Models } from "./Addons/common";
import models from "../config/models";

export default function Addons({ inputs }: { inputs: ModelState }) {
  const model = models[inputs.MODEL_ID.value];
  const [added, setAdded] = React.useState<AddedModel[]>([]);

  return (
    <Container
      sx={{
        border: "1px solid #ccc",
        borderRadius: "5px",
        position: "relative",
        py: 1,
        my: 1,
      }}
      // note sure why px above doesn't work???
      style={{ paddingLeft: "15px", paddingRight: "15px" }}
    >
      <span
        style={{
          position: "absolute",
          top: "-.75em",
          left: 10,
          background: "white",
          fontSize: "80%",
          color: "rgba(0, 0, 0, 0.6)",
          fontFamily: '"Roboto","Helvetica","Arial",sans-serif',
          fontWeight: 400,
          padding: "0px 5px 0px 5px",
        }}
      >
        Addons
      </span>
      <p style={{ fontSize: "80%" }}>
        Browse <a href="https://civitai.com/">CivitAI</a> and{" "}
        <FilterAlt
          sx={{ verticalAlign: "middle", color: "#888" }}
          fontSize="small"
        />{" "}
        filter for <Chip size="small" sx={{ fontSize: "80%" }} label="LORA" />{" "}
        models
        {!model.baseModel.startsWith("SDXL") && (
          <>
            {" "}
            or <Chip
              size="small"
              sx={{ fontSize: "80%" }}
              label="Embeddings"
            />{" "}
            (aka Textual Inversions)
          </>
        )}
        {model.baseModel.startsWith("SDXL") && (
          <>
            <br />
            <span style={{ fontSize: "80%" }}>
              Textual Inversions not available for SDXL yet. Upstream issue{" "}
              <a href="https://github.com/huggingface/diffusers/issues/4376">
                diffusers#4376
              </a>
            </span>
          </>
        )}
        .
      </p>
      <Models
        added={added}
        setAdded={setAdded}
        inputs={inputs}
        allowedTypes={["LORA", "TextualInversion"]}
      />
      <Box sx={{ pt: 2, fontSize: "80%" }}>
        <details>
          <summary> This can be temperamental. See usage notes. </summary>
          <ol>
            <style jsx>{`
              li {
                margin-bottom: 10px;
              }
            `}</style>
            <li>
              We&apos;re still working on this. Expect things to break! Your
              feedback is greatly appreciated and you can give it in the{" "}
              <a href="https://forums.kiri.art/c/app/17">forums</a>.
            </li>
            <li>
              LoRAs: 1) Currently, only one LoRA can be used at a time (tracked
              upstream at{" "}
              <a href="https://github.com/huggingface/diffusers/issues/2613">
                diffusers#2613
              </a>
              ). 2) LoRAs work best on the same model they were trained on;
              results can appear very garbled otherwise. We hope that moving
              forwards, the community will move away from fine-tuned models and
              we&apos;ll simply have many LoRAs for the original SDXL base.
              Let&apos;s see.
            </li>
            <li>
              Textual Inversions: currently, once a token has been added to a
              model by any user, it cannot be removed until a new model is
              loaded. This means it is currently not possible to easily update a
              token with a newer version of the embedding. For most users, this
              is unlikely to be an issue.
            </li>
          </ol>
        </details>
      </Box>
    </Container>
  );
}
