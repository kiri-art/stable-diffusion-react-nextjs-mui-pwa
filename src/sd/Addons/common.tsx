import React from "react";
import { toast } from "react-toastify";
import { t } from "@lingui/macro";

import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Stack,
  TextField,
  Tooltip,
} from "@mui/material";
import {
  Attribution,
  KeyboardReturn,
  Link as LinkIcon,
  MoneyOffCsred,
  RemoveShoppingCart,
  Delete,
} from "@mui/icons-material";

import models from "../../../src/config/models";
import { fetchModel, modelIdFromIdOrUrlOrHash } from "../../lib/civitai";
import type { Model, ModelVersion, ModelVersionFile } from "../../lib/civitai";
import { ModelState } from "../useModelState";

export interface AddedModel {
  model: Model;
  versionIndex: number;
}

function ModelVersionSelector({
  model,
  versionIndex,
  setVersionIndex,
}: {
  model: Model;
  versionIndex: number;
  setVersionIndex: (newIndex: number) => void;
}) {
  if (model.modelVersions.length === 1) return null;

  return (
    <>
      <select
        value={versionIndex}
        onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
          setVersionIndex(parseInt(event.target.value))
        }
      >
        {model.modelVersions.map((modelVersion, i) => (
          <option key={i} value={i}>
            {modelVersion.name}
          </option>
        ))}
      </select>{" "}
    </>
  );
}

export function Models({
  added,
  setAdded,
  inputs,
  requiredType,
  getTokens,
  maxLength,
}: {
  added: AddedModel[];
  setAdded: React.Dispatch<React.SetStateAction<AddedModel[]>>;
  inputs: ModelState;
  requiredType: typeof added[0]["model"]["type"];
  getTokens: (modelVersion: ModelVersion) => string[];
  maxLength?: number;
}) {
  const [loading, setLoading] = React.useState(false);
  const [value, setValue] = React.useState("");

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

    if (model.type !== requiredType) {
      setLoading(false);
      const type = model.type;
      toast(t`Model must be a "${requiredType}", not a "${type}".`);
      return;
    }

    for (const { model: m } of added)
      if (m.id === model.id) {
        setLoading(false);
        toast(t`Model is already added.`);
        return;
      }

    const versionIndex = 0;
    const newAdded = [...added, { model, versionIndex }];
    setAdded(newAdded);

    let file: ModelVersionFile | undefined;
    const modelVersion = model.modelVersions[versionIndex];

    for (const f of modelVersion.files) if (f.primary) file = f;
    if (!file) file = modelVersion.files[0];

    if (!file) {
      toast(`Model has no files.`);
      setLoading(false);
      return;
    }

    const image = model.modelVersions[0].images[0];
    if (image && image.meta) {
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
  }

  return (
    <>
      <ol>
        <style jsx>{`
          li {
            margin-bottom: 1.5em;
          }
        `}</style>
        {added.map(({ model, versionIndex }, i) => (
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
            (CivitAI)
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
                <span style={{ color: "#999", margin: "0 6px 0 6px" }}>
                  {!allowNoCredit && (
                    <Tooltip
                      enterTouchDelay={0}
                      title={t`Must credit the model creator.`}
                    >
                      <Attribution sx={{ verticalAlign: "middle", mx: 0.2 }} />
                    </Tooltip>
                  )}
                  {!canRent && (
                    <Tooltip
                      enterTouchDelay={0}
                      title={t`May only be used with free credits.`}
                    >
                      <MoneyOffCsred
                        sx={{ verticalAlign: "middle", mx: 0.2 }}
                      />
                    </Tooltip>
                  )}
                  {!canSellImages && (
                    <Tooltip
                      enterTouchDelay={0}
                      title={t`Created images may not be sold.`}
                    >
                      <RemoveShoppingCart
                        sx={{ verticalAlign: "middle", mx: 0.2 }}
                      />
                    </Tooltip>
                  )}
                </span>
              );
            })()}
            <IconButton onClick={() => removeIndex(i)}>
              <Delete />
            </IconButton>
            <br />
            <ModelVersionSelector
              model={model}
              versionIndex={versionIndex}
              setVersionIndex={(index) => {
                const newAdded = [...added];
                newAdded[i] = { ...newAdded[i], versionIndex: index };
                setAdded(newAdded);
              }}
            />
            {getTokens(model.modelVersions[versionIndex]).map((token) => (
              <Chip
                key={token}
                label={token}
                sx={{
                  "& .MuiChip-label:not(.copied)::after": {
                    content: '"📋"',
                  },
                  "& .MuiChip-label.copied::after": {
                    content: '"✅"',
                  },
                }}
                onClick={async (event: React.MouseEvent<HTMLSpanElement>) => {
                  try {
                    const target = event.target as HTMLSpanElement;
                    await navigator.clipboard.writeText(token);
                    target.classList.add("copied");
                    setTimeout(() => {
                      target.classList.remove("copied");
                    }, 1000);
                  } catch (error) {
                    toast(t`Failed to copy to clipboard`);
                  }
                }}
              />
            ))}
            {model.modelVersions[versionIndex].baseModel !==
              models[inputs.MODEL_ID.value].baseModel && (
              <div style={{ color: "#a00" }}>
                Requires {model.modelVersions[versionIndex].baseModel} but you
                selected a {models[inputs.MODEL_ID.value].baseModel} base model
                above.
              </div>
            )}
          </li>
        ))}
      </ol>
      {maxLength && added.length < maxLength && (
        <form>
          <Box>Model hash or CivitAI ID / URL:</Box>
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
      )}
    </>
  );
}
