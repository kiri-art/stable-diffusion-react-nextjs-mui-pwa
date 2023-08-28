import React from "react";
import { toast } from "react-toastify";
import { Trans, t } from "@lingui/macro";

import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  Slider,
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
import { styled } from "@mui/material/styles";
import MuiInput from "@mui/material/Input";

import models from "../../../src/config/models";
import { fetchModel, modelIdFromIdOrUrlOrHash } from "../../lib/civitai";
import type { Model, ModelVersionFile } from "../../lib/civitai";
import { ModelState } from "../useModelState";
import * as LORA from "./LoRAs";
import * as TextualInversion from "./TextualInversions";

const addons = { LORA, TextualInversion };

export type AddedModel = {
  model: Model;
  versionIndex: number;
} & (
  | { type: "LORA"; scale: number; lora: string }
  | { type: "TextualInversion" }
);

const Input = styled(MuiInput)`
  width: 55px;
`;

export default function InputSlider({
  onChange,
}: {
  onChange: (value: number) => void;
}) {
  const [value, _setValue] = React.useState<
    number | string | Array<number | string>
  >(1);

  const setValue = (newValue: number | string | Array<number | string>) => {
    _setValue(newValue);
    if (Array.isArray(newValue))
      onChange(
        typeof newValue[0] === "string" ? parseFloat(newValue[0]) : newValue[0]
      );
    else
      onChange(typeof newValue === "string" ? parseFloat(newValue) : newValue);
  };

  const handleSliderChange = (event: Event, newValue: number | number[]) => {
    setValue(newValue);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValue(event.target.value === "" ? "" : Number(event.target.value));
  };

  const handleBlur = () => {
    const f = Array.isArray(value)
      ? typeof value[0] === "string"
        ? parseFloat(value[0])
        : value[0]
      : typeof value === "string"
      ? parseFloat(value)
      : value;
    if (f < 0) {
      setValue(0);
    } else if (f > 1) {
      setValue(1);
    }
  };

  return (
    <Box sx={{ my: 1 }}>
      {/*
      <Typography id="input-slider" gutterBottom>
        <Trans>Scale</Trans>
      </Typography>
      */}
      <Grid container spacing={2} alignItems="center">
        <Grid item>
          <Trans>Scale</Trans>
        </Grid>
        <Grid item xs>
          <Slider
            value={typeof value === "number" ? value : 0}
            onChange={handleSliderChange}
            aria-labelledby="input-slider"
            min={0}
            max={1}
            step={0.05}
          />
        </Grid>
        <Grid item>
          <Input
            value={value}
            size="small"
            onChange={handleInputChange}
            onBlur={handleBlur}
            inputProps={{
              step: 0.05,
              min: 0,
              max: 1,
              type: "number",
              "aria-labelledby": "input-slider",
            }}
          />
        </Grid>
      </Grid>
    </Box>
  );
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
  allowedTypes,
}: {
  added: AddedModel[];
  setAdded: React.Dispatch<React.SetStateAction<AddedModel[]>>;
  inputs: ModelState;
  allowedTypes: typeof added[0]["model"]["type"][];
}) {
  const [loading, setLoading] = React.useState(false);
  const [value, setValue] = React.useState("");
  const [promptLoras, setPromptLoras] = React.useState<
    Record<string, { scale: number; str: string }> | undefined
  >();

  React.useEffect(() => {
    // When loading changes from true->false, clear the input.
    if (loading === false) setValue("");
  }, [loading]);

  React.useEffect(() => {
    addons.LORA.onChange(added, inputs, setPromptLoras);
    addons.TextualInversion.onChange(added, inputs);
  }, [added, inputs]);

  async function add(event: React.SyntheticEvent) {
    event.preventDefault();

    const id = await modelIdFromIdOrUrlOrHash(value);
    if (!id) {
      toast(t`No valid model ID, URL, or hash found.`);
      return;
    }

    setLoading(true);

    const model = await (async function () {
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

      return model;
    })();

    if (!model) {
      toast("Error loading model");
      setLoading(false);
      return;
    }

    console.log(model);

    if (!allowedTypes.includes(model.type)) {
      setLoading(false);
      const type = model.type;
      toast(
        t`Model must be a "${allowedTypes.join('", "')}", not a "${type}".`
      );
      return;
    }

    const addon = addons[model.type as "LORA" | "TextualInversion"];

    if (addon.MAX_LENGTH) {
      const currentLength = added.filter((m) => m.type === model.type).length;
      console.log({ currentLength }, addon);
      if (currentLength == addon.MAX_LENGTH) {
        setLoading(false);
        toast(
          `You can only add ${addon.MAX_LENGTH} ${model.type} model${
            addon.MAX_LENGTH > 1 ? "s" : ""
          }.`
        );
        return;
      }
    }

    for (const { model: m } of added)
      if (m.id === model.id) {
        setLoading(false);
        toast(t`Model is already added.`);
        return;
      }

    const versionIndex = 0;

    let file: ModelVersionFile | undefined;
    const modelVersion = model.modelVersions[versionIndex];

    for (const f of modelVersion.files) if (f.primary) file = f;
    if (!file) file = modelVersion.files[0];

    if (!file) {
      toast(`Model has no files.`);
      setLoading(false);
      return;
    }

    const newModel =
      model.type === "LORA"
        ? {
            type: "LORA" as const,
            model,
            versionIndex,
            scale: 1,
            lora: file.name.replace(/\.(safetensors|pt)$/, ""),
          }
        : { type: "TextualInversion" as const, model, versionIndex };
    const newAdded = [...added, newModel];

    setAdded(newAdded);

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
            // margin-bottom: 1.5em;
          }
        `}</style>
        {added.map(({ type, model, versionIndex, ...rest }, i) => (
          <li key={model.id}>
            {/*
            <Chip label={type} />{" "}
            */}
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
            {addons[model.type as "LORA" | "TextualInversion"]
              .getTokensFromModelVersion(model.modelVersions[versionIndex])
              .map((token) => (
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
                    mx: 0.4,
                    my: 0.5,
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
            {type === "LORA" &&
              // @ts-expect-error: later
              (promptLoras && promptLoras[rest.lora] ? (
                <div style={{ fontSize: "80%" }}>
                  Set in prompt:{" "}
                  {
                    // @ts-expect-error: later
                    promptLoras[rest.lora].str
                  }
                </div>
              ) : (
                <InputSlider
                  onChange={(value) => {
                    const newAdded = [...added];
                    // @ts-expect-error: another day
                    newAdded.splice(i, 1, { ...newAdded[i], scale: value });
                    setAdded(newAdded);
                  }}
                />
              ))}
            {model.modelVersions[versionIndex].baseModel !==
              models[inputs.MODEL_ID.value].baseModel && (
              <div style={{ color: "#a00", fontSize: "80%" }}>
                Requires {model.modelVersions[versionIndex].baseModel} but you
                selected a {models[inputs.MODEL_ID.value].baseModel} base model
                above.
                <Button
                  onClick={() => {
                    // @ts-expect-error: later
                    inputs.MODEL_ID.forceBaseModel =
                      model.modelVersions[versionIndex].baseModel;
                    // @ts-expect-error: later
                    inputs.MODEL_ID.setOpen(true);
                  }}
                >
                  Change
                </Button>
              </div>
            )}
          </li>
        ))}
      </ol>
      <form>
        <Stack direction="row" spacing={0}>
          <TextField
            sx={{
              // mx: 1
              width: 300,
            }}
            size="small"
            value={value}
            onChange={(error) => setValue(error.target.value)}
            placeholder="Model hash or CivitAI ID / URL"
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
    </>
  );
}
