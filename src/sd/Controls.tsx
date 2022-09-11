import React, { useMemo } from "react";
import { t, Trans } from "@lingui/macro";
import { useGongoUserId, useGongoOne } from "gongo-client-react";

import type { ModelState } from "./useModelState";
import { isDev, REQUIRE_REGISTRATION } from "../lib/client-env";

import {
  Box,
  Button,
  FormControl,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Tooltip,
} from "@mui/material";
import { Clear, Height, Help, Scale } from "@mui/icons-material";

import InputSlider from "../InputSlider";
import defaults from "../sd/defaults";

function EmojiIcon({ children, ...props }: { children: React.ReactNode }) {
  return (
    <Box
      sx={{
        mt: -2,
        width: 25.5,
        height: 25.5,
        textAlign: "center",
        fontSize: "150%",
        verticalAlign: "top",
        ...props,
      }}
    >
      {children}
    </Box>
  );
}

function Prompt({
  value,
  setValue,
  placeholder,
}: {
  value: ModelState["prompt"]["value"];
  setValue: ModelState["prompt"]["setValue"];
  placeholder?: string;
}) {
  return useMemo(() => {
    function promptKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
      // Submit on "enter" but allow newline creation on shift-enter.
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();

        // @ts-expect-error: TODO
        event.target.form.dispatchEvent(
          new Event("submit", { cancelable: true, bubbles: true })
        );
      }
    }

    return (
      <TextField
        label="Prompt"
        fullWidth
        multiline
        onKeyDown={promptKeyDown}
        value={value}
        placeholder={placeholder}
        InputLabelProps={{ shrink: true }}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          setValue(event.target.value);
        }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={() => setValue("")}>
                <Clear />
              </IconButton>
              <Tooltip
                title={
                  <Box>
                    <Trans>
                      Description / caption of your desired image. May include
                      art styles like &apos;impressionist&apos;, &apos;digital
                      art&apos;, photographic styles and lenses, and other
                      hints.
                    </Trans>{" "}
                    <Trans>
                      <a href="https://docs.google.com/document/d/17VPu3U2qXthOpt2zWczFvf-AH6z37hxUbvEe1rJTsEc">
                        Learn more
                      </a>
                    </Trans>
                  </Box>
                }
                enterTouchDelay={0}
                leaveDelay={2000}
              >
                <Help />
              </Tooltip>
            </InputAdornment>
          ),
        }}
      />
    );
  }, [value, setValue, placeholder]);
}

function Strength_Grid_Slider({
  value,
  setValue,
  defaultValue,
}: {
  value: ModelState["strength"]["value"];
  setValue: ModelState["strength"]["setValue"];
  defaultValue: typeof defaults.strength;
}) {
  return useMemo(
    () => (
      <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
        {/*
          tooltip={
            <Box>
              <Trans>
                How closely to follow the prompt. Lower values = more creative,
                more variety. Higher values = more exact, may cause artifacts.
                Values of 5 - 15 tend to work best.
              </Trans>{" "}
              <Trans>
                <a href="https://benanne.github.io/2022/05/26/guidance.html">
                  Learn more
                </a>
              </Trans>
            </Box>
          }
          */}
        <InputSlider
          label={t`(Denoising) Strength`}
          value={value}
          setValue={setValue}
          defaultValue={defaultValue}
          icon={<EmojiIcon>💪</EmojiIcon>}
          min={0}
          max={1}
          step={0.05}
        />
      </Grid>
    ),
    [value, setValue, defaultValue]
  );
}

function CFS_Grid_Slider({
  value,
  setValue,
  defaultValue,
}: {
  value: ModelState["guidance_scale"]["value"];
  setValue: ModelState["guidance_scale"]["setValue"];
  defaultValue: typeof defaults.guidance_scale;
}) {
  return useMemo(
    () => (
      <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
        <InputSlider
          label={t`Classifier-Free Guidance (Scale)`}
          value={value}
          setValue={setValue}
          defaultValue={defaultValue}
          tooltip={
            <Box>
              <Trans>
                How closely to follow the prompt. Lower values = more creative,
                more variety. Higher values = more exact, may cause artifacts.
                Values of 5 - 15 tend to work best.
              </Trans>{" "}
              <Trans>
                <a href="https://benanne.github.io/2022/05/26/guidance.html">
                  Learn more
                </a>
              </Trans>
            </Box>
          }
          icon={<Scale />}
          min={1}
          max={50}
          step={0.1}
        />
      </Grid>
    ),
    [value, setValue, defaultValue]
  );
}

function Steps_Grid_Slider({
  value,
  setValue,
  defaultValue,
}: {
  value: ModelState["guidance_scale"]["value"];
  setValue: ModelState["guidance_scale"]["setValue"];
  defaultValue: typeof defaults.guidance_scale;
}) {
  return useMemo(
    () => (
      <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
        <InputSlider
          label={t`Number of Inference Steps`}
          value={value}
          setValue={setValue}
          defaultValue={defaultValue}
          icon={<EmojiIcon>👣</EmojiIcon>}
          tooltip={
            <Box>
              <Trans>
                Number of denoising steps (how many times to iterate over and
                improve the image). Larger numbers take longer to render but may
                produce higher quality results.
              </Trans>{" "}
              <Trans>
                <a href="https://huggingface.co/blog/stable_diffusion">
                  Learn more
                </a>
              </Trans>
            </Box>
          }
        />
      </Grid>
    ),
    [value, setValue, defaultValue]
  );
}

function Width_Grid_Slider({
  value,
  setValue,
  defaultValue,
}: {
  value: ModelState["guidance_scale"]["value"];
  setValue: ModelState["guidance_scale"]["setValue"];
  defaultValue: typeof defaults.guidance_scale;
}) {
  return useMemo(
    () => (
      <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
        {" "}
        <InputSlider
          label={t`Width`}
          value={value}
          setValue={setValue}
          defaultValue={defaultValue}
          icon={<EmojiIcon>⭤</EmojiIcon>}
          step={8}
          min={8}
          max={1024}
          marks={true}
          tooltip={
            <Box>
              <Trans>Width of output image.</Trans>{" "}
              <Trans>
                Maximum size is 1024x768 or 768x1024 because of memory limits.
              </Trans>
            </Box>
          }
        />
      </Grid>
    ),
    [value, setValue, defaultValue]
  );
}

function Height_Grid_Slider({
  value,
  setValue,
  defaultValue,
}: {
  value: ModelState["guidance_scale"]["value"];
  setValue: ModelState["guidance_scale"]["setValue"];
  defaultValue: typeof defaults.guidance_scale;
}) {
  return useMemo(
    () => (
      <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
        <InputSlider
          label={t`Height`}
          value={value}
          setValue={setValue}
          defaultValue={defaultValue}
          icon={<Height />}
          step={8}
          min={8}
          max={1024}
          marks={true}
          tooltip={
            <Box>
              <Trans>Width of output image.</Trans>{" "}
              <Trans>
                Maximum size is 1024x768 or 768x1024 because of memory limits.
              </Trans>
            </Box>
          }
        />
      </Grid>
    ),
    [value, setValue, defaultValue]
  );
}

export default function SDControls({
  inputs,
  go,
  randomPrompt,
  uiState,
}: {
  inputs: ModelState;
  go: (event: React.SyntheticEvent) => void;
  randomPrompt?: string;
  uiState: {
    dest: { value: string; set: React.Dispatch<React.SetStateAction<string>> };
  };
}) {
  const userId = useGongoUserId();
  const user = useGongoOne((db) =>
    db.collection("users").find({ _id: userId })
  );

  function setWidthHeight(
    width: number | string,
    height: number | string,
    which: string
  ) {
    if (width > height) {
      if (height > 768) height = 768;
    } else {
      if (width > 768) width = 768;
    }
    if (width !== inputs.width.value) inputs.width.setValue(width);
    if (height !== inputs.height.value) inputs.height.setValue(height);
    return which === "width" ? width : height;
  }
  const setWidth = (width: number | string) =>
    setWidthHeight(width, inputs.height.value, "width");
  const setHeight = (height: number | string) =>
    setWidthHeight(inputs.width.value, height, "height");

  return (
    <Box sx={{ my: 2 }}>
      <form onSubmit={go}>
        <Prompt
          value={inputs.prompt.value}
          setValue={inputs.prompt.setValue}
          placeholder={randomPrompt}
        />

        {isDev ? (
          <Grid container sx={{ my: 1 }}>
            <Grid item xs={7} sm={8} md={9}>
              <Button
                variant="contained"
                fullWidth
                sx={{ my: 1 }}
                type="submit"
              >
                {!REQUIRE_REGISTRATION ||
                user?.credits?.free > 0 ||
                user?.credits?.paid > 0 ? (
                  <Trans>Go</Trans>
                ) : user ? (
                  <Trans>Get More Credits</Trans>
                ) : (
                  <Trans>Login</Trans>
                )}
              </Button>
            </Grid>
            <Grid item xs={5} sm={4} md={3} sx={{ pl: 1, pt: 1 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="dest-select-label">Dest</InputLabel>
                <Select
                  labelId="dest-select-label"
                  id="dest-select"
                  value={uiState.dest.value}
                  label="Dest"
                  onChange={(e) => uiState.dest.set(e.target.value as string)}
                >
                  <MenuItem value="exec">exec (local)</MenuItem>
                  <MenuItem value="banana-local">banana (local)</MenuItem>
                  <MenuItem value="banana-remote">banana (remote)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        ) : (
          <Button variant="contained" fullWidth sx={{ my: 1 }} onClick={go}>
            Go
          </Button>
        )}

        <Grid container spacing={2} sx={{ mt: 1 }}>
          {inputs.strength && (
            <Strength_Grid_Slider
              value={inputs.strength.value}
              setValue={inputs.strength.setValue}
              defaultValue={defaults.strength}
            />
          )}
          <CFS_Grid_Slider
            value={inputs.guidance_scale.value}
            setValue={inputs.guidance_scale.setValue}
            defaultValue={defaults.guidance_scale}
          />
          <Steps_Grid_Slider
            value={inputs.num_inference_steps.value}
            setValue={inputs.num_inference_steps.setValue}
            defaultValue={defaults.num_inference_steps}
          />
          {inputs.width && (
            <Width_Grid_Slider
              value={inputs.width.value}
              // @ts-expect-error: TODO
              setValue={setWidth}
              defaultValue={defaults.width}
            />
          )}
          {inputs.height && (
            <Height_Grid_Slider
              value={inputs.height.value}
              // @ts-expect-error: TODO
              setValue={setHeight}
              defaultValue={defaults.height}
            />
          )}
        </Grid>
      </form>
    </Box>
  );
}
