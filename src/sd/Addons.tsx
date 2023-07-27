import React from "react";
import { toast } from "react-toastify";

import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Attribution,
  FilterAlt,
  KeyboardReturn,
  Link as LinkIcon,
  MoneyOffCsred,
  RemoveShoppingCart,
  Delete,
} from "@mui/icons-material";

import models from "../../src/config/models";
import { fetchModel, modelIdFromIdOrUrlOrHash } from "../lib/civitai";
import type { Model, ModelVersion, ModelVersionFile } from "../lib/civitai";
import { ModelState } from "./useModelState";
import { t } from "@lingui/macro";

function LoRAs({
  setLoraWeights,
}: {
  setLoraWeights: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  setLoraWeights;
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

      <p>Working on this next!</p>
    </div>
  );
}

function TextualInversion({
  inputs,
  setTextualInversions,
}: {
  inputs: ModelState;
  setTextualInversions: React.Dispatch<React.SetStateAction<string[]>>;
}) {
  const [added, setAdded] = React.useState<Model[]>([]);
  const [value, setValue] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  console.log({ added });

  function getTokenFromModelVersion(modelVersion: ModelVersion) {
    // No!  These are often wrong.
    // modelVersion.trainedWords?.[0]

    let file;
    for (const f of modelVersion.files) if (f.primary) file = f;
    if (!file) file = modelVersion.files[0];

    const token = file.name.replace(/\..*$/, "");
    return token;
  }

  async function add(event: React.SyntheticEvent) {
    event.preventDefault();

    const id = await modelIdFromIdOrUrlOrHash(value);
    if (!id) {
      toast(t`No valid model ID, URL, or hash found.`);
      return;
    }

    setLoading(true);
    let model;
    try {
      model = await fetchModel(id);
    } catch (error) {
      if (error instanceof Error) toast(error.message);
      setLoading(false);
      return;
    }

    if (typeof model === "string") {
      toast(model);
      setLoading(false);
      return;
    }

    console.log(model);

    if (model.type !== "TextualInversion") {
      setLoading(false);
      const type = model.type;
      toast(t`Model must be a "Textual Inversion", not a "${type}".`);
      return;
    }

    for (const m of added)
      if (m.id === model.id) {
        setLoading(false);
        toast(t`Model is already added.`);
        return;
      }

    const newAdded = [...added, model];
    setAdded(newAdded);

    let file: ModelVersionFile | undefined;
    const modelVersion = model.modelVersions[0]; // TODO

    for (const f of modelVersion.files) if (f.primary) file = f;
    if (!file) file = modelVersion.files[0];

    if (!file) {
      toast(`Model has no files.`);
      setLoading(false);
      return;
    }

    const token = getTokenFromModelVersion(modelVersion);

    console.log(
      newAdded.map(
        (_model) =>
          // @ts-expect-error: 'file' is possibly 'undefined'
          file.downloadUrl +
          "#fname=" +
          // @ts-expect-error: 'file' is possibly 'undefined'
          file.name +
          "&token=" +
          token
        // modelVersion.trainedWords?.[0]
      )
    );

    setTextualInversions(
      newAdded.map(
        (_model) =>
          // @ts-expect-error: 'file' is possibly 'undefined'
          file.downloadUrl +
          "#fname=" +
          // @ts-expect-error: 'file' is possibly 'undefined'
          file.name +
          "&token=" +
          token
        // modelVersion.trainedWords?.[0]
      )
    );

    const image = model.modelVersions[0].images[0];
    if (image) {
      const { meta } = image;
      if (inputs.prompt.value === "") inputs.prompt.setValue(meta.prompt);
      if (inputs.negative_prompt.value === "")
        inputs.negative_prompt.setValue(meta.negativePrompt);
      if (inputs.randomizeSeed.value === true) inputs.seed.setValue(meta.seed);
      // if (inputs.num_inference_steps.value === defaults.num_inference_steps)
      // Model, "Model hash", "Size", cfgScale, sampler, seed, steps
    }

    setLoading(false);
  }

  async function removeIndex(i: number) {
    const newAdded = added.filter((_, j) => j !== i);
    setAdded(newAdded);
    setTextualInversions(
      // @ts-expect-error: 'file' is possibly 'undefined'
      newAdded.map((_model) => file.downloadUrl + "#fname=" + file.name)
    );
  }

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
      <ol>
        {added.map((model, i) => (
          <li key={model.id}>
            <a target="_blank" href={`https://civitai.com/models/${model.id}`}>
              {model.name}
            </a>{" "}
            <LinkIcon sx={{ verticalAlign: "middle" }} fontSize="small" /> by{" "}
            <a
              target="_blank"
              href={"https://civitai.com/user/" + model.creator.username}
            >
              {model.creator.username}
            </a>{" "}
            (CivitAI){" "}
            <Chip
              key={getTokenFromModelVersion(model.modelVersions[0])}
              label={getTokenFromModelVersion(model.modelVersions[0])}
              sx={{
                "& .copied::after": {
                  content: '"📋✅"',
                },
              }}
              onClick={async (event: React.SyntheticEvent) => {
                try {
                  await navigator.clipboard.writeText(
                    getTokenFromModelVersion(model.modelVersions[0])
                  );
                  // @ts-expect-error: another day
                  event.target.classList.add("copied");
                  setTimeout(() => {
                    // @ts-expect-error: another day
                    event.target.classList.remove("copied");
                  }, 1000);
                } catch (error) {
                  toast(t`Failed to copy to clipboard`);
                }
              }}
            />
            {(function () {
              // https://github.com/civitai/civitai/blob/main/src/components/PermissionIndicator/PermissionIndicator.tsx
              const permissions = model;
              const { allowNoCredit, allowCommercialUse } = permissions;
              const canSellImages =
                allowCommercialUse === "Image" ||
                allowCommercialUse === "Rent" ||
                allowCommercialUse === "Sell";
              const canRent =
                allowCommercialUse === "Rent" || allowCommercialUse === "Sell";

              return (
                <span style={{ color: "#999" }}>
                  {!allowNoCredit && (
                    <Tooltip title={t`Must credit the model creator.`}>
                      <Attribution sx={{ verticalAlign: "middle" }} />
                    </Tooltip>
                  )}
                  {!canRent && (
                    <Tooltip title={t`May only be used with free credits.`}>
                      <MoneyOffCsred sx={{ verticalAlign: "middle" }} />
                    </Tooltip>
                  )}
                  {!canSellImages && (
                    <Tooltip title={t`Created images may not be sold.`}>
                      <RemoveShoppingCart sx={{ verticalAlign: "middle" }} />
                    </Tooltip>
                  )}
                </span>
              );
            })()}
            <IconButton onClick={() => removeIndex(i)}>
              <Delete />
            </IconButton>
            {model.modelVersions[0].baseModel !==
              models[inputs.MODEL_ID.value].baseModel && (
              <div style={{ color: "#a00" }}>
                Requires {model.modelVersions[0].baseModel} but you selected a{" "}
                {models[inputs.MODEL_ID.value].baseModel} base model above.
              </div>
            )}
          </li>
        ))}
      </ol>
      <form>
        <Box sx={{ lineHeight: "2.4em" }}>Model hash or CivitAI ID / URL:</Box>
        <Stack direction="row">
          <TextField
            sx={{ mx: 1 }}
            size="small"
            value={value}
            onChange={(error) => setValue(error.target.value)}
          />
          <Button onClick={add} disabled={loading} type="submit">
            {loading ? (
              <CircularProgress size="1.5em" />
            ) : (
              <KeyboardReturn fontSize="small" />
            )}
          </Button>
        </Stack>
      </form>
      <p style={{ fontSize: "70%" }}>
        Note: currently, once a token has been added to a model by any user, it
        cannot be removed until a new model is loaded. This means it is
        currently not possible to easily update a token with a newer version of
        the embedding. For most users, this is unlikely to be an issue.
      </p>
    </div>
  );
}

export default function Addons({ inputs }: { inputs: ModelState }) {
  const [show, setShow] = React.useState(false);

  return (
    <>
      <Button onClick={() => setShow(!show)}>
        {show ? "Hide" : "Show"} Addon Options (WIP experiment)
      </Button>
      <span
        style={{
          position: "relative",
          top: "5px",
          marginLeft: "2px",
          verticalAlign: "top",
          background: "#dada88",
          borderRadius: "3px",
          fontSize: "30%",
          padding: "2px 5px 2px 5px",
        }}
      >
        NEW
      </span>
      {show && (
        <Container
          sx={{
            border: "1px solid #aaa;",
            borderRadius: "5px",
            background: "#fafafa",
          }}
        >
          <p>
            We&apos;re still working on this. Expect things to break! Your
            feedback is greatly appreciated and you can give it in the{" "}
            <a href="https://forums.kiri.art/c/app/17">forums</a>.
          </p>
          <TextualInversion
            inputs={inputs}
            setTextualInversions={inputs.textual_inversions.setValue}
          />
          <LoRAs setLoraWeights={inputs.lora_weights.setValue} />
        </Container>
      )}
    </>
  );
}
