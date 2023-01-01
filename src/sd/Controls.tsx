import React, { useMemo } from "react";
import { t, Trans } from "@lingui/macro";
import { db, useGongoUserId, useGongoOne } from "gongo-client-react";

import {
  Box,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from "@mui/material";
import {
  Clear,
  Height,
  Help,
  HelpOutline,
  Scale,
  SettingsBackupRestore,
} from "@mui/icons-material";

import InputSlider from "../InputSlider";
import defaults, { MAX_SEED_VALUE } from "../sd/defaults";
import sharedInputTextFromInputs from "../lib/sharedInputTextFromInputs";
import GoButton from "../GoButton";
import stableDiffusionInputsSchema from "../schemas/stableDiffusionInputs";
import type { ModelState } from "./useModelState";
import { getRandomPrompt } from "./useRandomPrompt";
import useOver18 from "../lib/useOver18";

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
  getRandomPrompt,
}: {
  value: ModelState["prompt"]["value"];
  setValue: ModelState["prompt"]["setValue"];
  placeholder?: string;
  getRandomPrompt: () => string;
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
        // dir="ltr"
        // lang="en"
        label={t`Prompt`}
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
              <IconButton onClick={() => setValue("")} edge="end">
                <Clear />
              </IconButton>
              <IconButton onClick={() => setValue(getRandomPrompt())}>
                <SettingsBackupRestore />
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
                      <a
                        target="_blank"
                        rel="noreferrer"
                        href="https://docs.google.com/document/d/17VPu3U2qXthOpt2zWczFvf-AH6z37hxUbvEe1rJTsEc"
                      >
                        Learn more
                      </a>
                    </Trans>
                  </Box>
                }
                enterDelay={0}
                enterTouchDelay={0}
                leaveDelay={0}
                leaveTouchDelay={4000}
              >
                <Help />
              </Tooltip>
            </InputAdornment>
          ),
        }}
      />
    );
  }, [value, setValue, placeholder, getRandomPrompt]);
}

function NegativePrompt({
  value,
  setValue,
  defaultValue,
}: {
  value: ModelState["negative_prompt"]["value"];
  setValue: ModelState["negative_prompt"]["setValue"];
  defaultValue: string;
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
        // dir="ltr"
        // lang="en"
        label={t`Negative Prompt`}
        sx={{ my: 1 }}
        fullWidth
        multiline
        onKeyDown={promptKeyDown}
        value={value}
        // placeholder={placeholder}
        InputLabelProps={{ shrink: true }}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          setValue(event.target.value);
        }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={() => setValue("")} edge="end">
                <Clear />
              </IconButton>
              <IconButton onClick={() => setValue(defaultValue)}>
                <SettingsBackupRestore />
              </IconButton>
              <Tooltip
                title={
                  <Box>
                    <Trans>
                      Description of all the things you <i>don&apos;t want</i>{" "}
                      in the output image, e.g. prompt: &quot;bouquet of
                      roses&quot;, negative prompt: &quot;red roses&quot;. You
                      can also ask to exclude common diffusion artifacts like
                      &quot;deformed hands&quot;. Click the &quot;reset&quot;
                      icon for some common defaults.
                    </Trans>{" "}
                    <Trans>
                      <a
                        target="_blank"
                        rel="noreferrer"
                        href="https://github.com/AUTOMATIC1111/stable-diffusion-webui/wiki/Negative-prompt"
                      >
                        Learn more
                      </a>
                    </Trans>
                  </Box>
                }
                enterDelay={0}
                enterTouchDelay={0}
                leaveDelay={0}
                leaveTouchDelay={4000}
              >
                <Help />
              </Tooltip>
            </InputAdornment>
          ),
        }}
      />
    );
  }, [value, setValue, defaultValue]);
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
                <a target="_blank" rel="noreferrer" href="https://benanne.github.io/2022/05/26/guidance.html">
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
                <a
                  target="_blank"
                  rel="noreferrer"
                  href="https://benanne.github.io/2022/05/26/guidance.html"
                >
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
  sampler,
}: {
  value: ModelState["guidance_scale"]["value"];
  setValue: ModelState["guidance_scale"]["setValue"];
  defaultValue: typeof defaults.guidance_scale;
  sampler: ModelState["sampler"]["value"];
}) {
  return useMemo(
    () => (
      <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
        <InputSlider
          label={t`Number of Inference Steps`}
          value={value}
          setValue={setValue}
          defaultValue={defaultValue}
          // @ts-expect-error: TODO
          schema={stableDiffusionInputsSchema.fields.num_inference_steps}
          icon={<EmojiIcon>👣</EmojiIcon>}
          tooltip={
            <Box>
              <Trans>
                Number of denoising steps (how many times to iterate over and
                improve the image). Larger numbers take longer to render but may
                produce higher quality results.
              </Trans>{" "}
              <Trans>
                <a
                  target="_blank"
                  rel="noreferrer"
                  href="https://huggingface.co/blog/stable_diffusion"
                >
                  Learn more
                </a>
              </Trans>
            </Box>
          }
        />
        {sampler === "DPMSolverMultistepScheduler" && (
          <>
            <div style={{ fontSize: "80%", marginLeft: 42 }}>
              New DPM sampler needs just 20 steps! 🎉
            </div>
          </>
        )}
      </Grid>
    ),
    [value, setValue, defaultValue, sampler]
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
          step={64}
          min={64}
          max={1024}
          marks={true}
          tooltip={
            <Box>
              <Trans>Width of output image.</Trans>{" "}
              <Trans>
                Must be a multiple of 64. Maximum image size is 1024x768 or
                768x1024 because of memory limits.
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
          step={64}
          min={64}
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

function Seed({
  value,
  setValue,
  _defaultValue,
  randomizeSeedValue,
}: {
  value: ModelState["seed"]["value"];
  setValue: ModelState["seed"]["setValue"];
  _defaultValue: typeof defaults.seed;
  randomizeSeedValue: boolean;
}) {
  return useMemo(() => {
    const error = !(value || randomizeSeedValue);

    return (
      <Grid item xs={6} sm={4} md={3} lg={2}>
        <TextField
          label={t`Seed`}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          size="small"
          fullWidth
          error={error}
          type="number"
          disabled={randomizeSeedValue}
          helperText={
            error && (
              <Trans>
                Please enter a valid seed or turn &quot;Randomize&quot; back on.
              </Trans>
            )
          }
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip
                  title={
                    <Box>
                      <Trans>
                        Using an identical seed with identical options (prompt,
                        guidance scale, etc) will always produce the same image.
                        This can be useful to tweak prior creations, to
                        understand how the other options affect the process (by
                        removing the &quot;random&quot; element), or when
                        sharing your work. A number between {0} and{" "}
                        {MAX_SEED_VALUE}.
                      </Trans>
                    </Box>
                  }
                  enterDelay={0}
                  enterTouchDelay={0}
                  leaveDelay={0}
                  leaveTouchDelay={5000}
                >
                  <HelpOutline
                    sx={{ verticalAlign: "bottom", opacity: 0.5, ml: 1 }}
                  />
                </Tooltip>
              </InputAdornment>
            ),
          }}
        />
      </Grid>
    );
  }, [value, setValue, randomizeSeedValue]);
}

function RandomizeSeed({
  value,
  setValue,
  _defaultValue,
  setSeed,
  defaultSeed,
}: {
  value: ModelState["randomizeSeed"]["value"];
  setValue: ModelState["randomizeSeed"]["setValue"];
  _defaultValue: boolean;
  setSeed: ModelState["seed"]["setValue"];
  defaultSeed: typeof defaults.seed;
}) {
  return useMemo(() => {
    const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      setValue(event.target.checked);
      if (event.target.checked) setSeed(defaultSeed());
    };

    return (
      <Grid item xs={6} sm={4} md={3} lg={2}>
        <Stack
          direction="row"
          spacing={0}
          justifyContent="center"
          alignItems="center"
        >
          <FormGroup sx={{ alignItems: "center" }}>
            <FormControlLabel
              sx={{ mr: 0 }}
              control={<Switch checked={value} onChange={onChange} />}
              label={
                <Box>
                  <Trans>Randomize</Trans>
                </Box>
              }
            />
          </FormGroup>
          <Tooltip
            title={
              <Box>
                <Trans>
                  Randomize Seed on every request. This means each new image
                  will be completely different. If you want to, instead,
                  &quot;tweak&quot; your last creation, turn this off.
                </Trans>
              </Box>
            }
            enterDelay={0}
            enterTouchDelay={0}
            leaveDelay={0}
            leaveTouchDelay={3000}
          >
            <HelpOutline
              sx={{ verticalAlign: "bottom", opacity: 0.5, ml: 1 }}
            />
          </Tooltip>
        </Stack>
      </Grid>
    );
  }, [value, setValue, setSeed, defaultSeed]);
}

function ShareInputs({
  value,
  setValue,
  _defaultValue,
  sharedInputs,
}: {
  value: ModelState["shareInputs"]["value"];
  setValue: ModelState["shareInputs"]["setValue"];
  _defaultValue: boolean;
  sharedInputs: string;
}) {
  return React.useMemo(() => {
    return (
      <Grid item xs={6} sm={4} md={3} lg={2}>
        <Stack
          direction="row"
          spacing={0}
          justifyContent="center"
          alignItems="center"
        >
          <FormGroup sx={{ alignItems: "center" }}>
            <FormControlLabel
              sx={{ mr: 0 }}
              control={
                <Switch
                  checked={value}
                  onChange={(event) => setValue(event.target.checked)}
                />
              }
              label={
                <Box>
                  <Trans>Share Inputs</Trans>
                </Box>
              }
            />
          </FormGroup>
          <Tooltip
            title={
              <Box>
                <Trans>
                  &quot;Share&quot; button / filename will include &quot;
                  {sharedInputs}&quot; after the prompt.
                </Trans>
              </Box>
            }
            enterDelay={0}
            enterTouchDelay={0}
            leaveDelay={0}
            leaveTouchDelay={3000}
          >
            <HelpOutline
              sx={{ verticalAlign: "bottom", opacity: 0.5, ml: 1 }}
            />
          </Tooltip>
        </Stack>
      </Grid>
    );
  }, [value, setValue, sharedInputs]);
}

function SafetyChecker({
  value,
  setValue,
  _defaultValue,
}: {
  value: ModelState["safety_checker"]["value"];
  setValue: ModelState["safety_checker"]["setValue"];
  _defaultValue: boolean;
}) {
  const userId = useGongoUserId();
  const user = useGongoOne((db) =>
    db.collection("users").find({ _id: userId })
  );
  const over18 = useOver18();

  const confirmDob = React.useCallback(
    function confirmDob(event: React.SyntheticEvent) {
      event.preventDefault();

      let dob: false | null | Date = false;
      while (dob === false) {
        const str = prompt("Please enter your Date of Birth");
        if (str != null) {
          const date = new Date(str);
          if (isNaN(date.getTime())) {
            dob = confirm("Invalid date, try again?") ? false : null;
            if (dob === null) break;
          } else {
            dob = confirm(date.toLocaleDateString() + "\nIs that right?")
              ? date
              : false;
          }
        } else dob = null;

        if (dob) {
          console.log({ dob });
          db.collection("users").update({ _id: userId }, { $set: { dob } });
        }
      }
    },
    [userId]
  );

  return React.useMemo(() => {
    return (
      <>
        {(!user || !user.dob || over18) && (
          <Grid item xs={6} sm={4} md={3} lg={2}>
            <Stack
              direction="row"
              spacing={0}
              justifyContent="center"
              alignItems="center"
            >
              <FormGroup sx={{ alignItems: "center" }}>
                <FormControlLabel
                  sx={{ mr: 0 }}
                  control={
                    <Switch
                      checked={value}
                      onChange={(event) => setValue(event.target.checked)}
                      disabled={!over18}
                    />
                  }
                  label={
                    <Box>
                      <Trans>NSFW Filter</Trans>
                    </Box>
                  }
                />
              </FormGroup>
              <Tooltip
                title={
                  <Box>
                    <Trans>
                      Filter out images that may be NSFW (&quot;Not Safe for
                      Work&quot;) and inappropriate for under 18s.
                    </Trans>{" "}
                    <Trans>A black image will be shown instead.</Trans>
                  </Box>
                }
                enterDelay={0}
                enterTouchDelay={0}
                leaveDelay={0}
                leaveTouchDelay={3000}
              >
                <HelpOutline
                  sx={{ verticalAlign: "bottom", opacity: 0.5, ml: 1 }}
                />
              </Tooltip>
            </Stack>
          </Grid>
        )}
        {user && !user.dob && (
          <Grid item xs={6} sm={4} md={3} lg={2} sx={{ textAlign: "center" }}>
            <a target="_blank" rel="noreferrer" href="#" onClick={confirmDob}>
              <Trans>Confirm Date of Birth</Trans>
            </a>
          </Grid>
        )}
      </>
    );
  }, [value, setValue, confirmDob, over18, user]);
}

function ModelMenuItem({ value, desc }: { value: string; desc: string }) {
  return (
    <Box sx={{ textAlign: "center", width: "100%" }}>
      <div style={{ fontWeight: "bold" }}>{value}</div>
      <div>{desc}</div>
    </Box>
  );
}

function ModelSelect({
  value,
  setValue,
  defaultValue,
}: {
  value: ModelState["MODEL_ID"]["value"];
  setValue: ModelState["MODEL_ID"]["setValue"];
  defaultValue: typeof defaults.MODEL_ID;
}) {
  return useMemo(
    () => (
      <FormControl fullWidth sx={{ my: 1 }}>
        <InputLabel id="model-select-label">
          <Trans>Model</Trans>
        </InputLabel>
        <Select
          id="model-select"
          label={t`Model`}
          labelId="model-select-label"
          value={value}
          defaultValue={defaultValue}
          onChange={(event) => setValue(event.target.value)}
          size="small"
        >
          {/* Unfortunately <Select /> relies on having direct <MenuItem /> children */}
          <MenuItem
            value="stabilityai/stable-diffusion-2-1-base"
            sx={{ textAlign: "center", width: "100%" }}
          >
            <ModelMenuItem
              value="stabilityai/stable-diffusion-2-1-base"
              desc={t`Latest Stable Diffusion, Dec 6th. (512x512)`}
            />
          </MenuItem>

          <MenuItem
            value="stabilityai/stable-diffusion-2-1"
            sx={{ textAlign: "center", width: "100%" }}
          >
            <ModelMenuItem
              value="stabilityai/stable-diffusion-2-1"
              desc={t`Latest Stable Diffusion, Dec 6th. (768x768)`}
            />
          </MenuItem>

          <MenuItem
            value="stabilityai/stable-diffusion-2-base"
            sx={{ textAlign: "center", width: "100%" }}
          >
            <ModelMenuItem
              value="stabilityai/stable-diffusion-2-base"
              desc={t`Stable Diffusion from Nov 24th. (512x512)`}
            />
          </MenuItem>

          <MenuItem
            value="stabilityai/stable-diffusion-2"
            sx={{ textAlign: "center", width: "100%" }}
          >
            <ModelMenuItem
              value="stabilityai/stable-diffusion-2"
              desc={t`Stable Diffusion from Nov 24th. (768x768)`}
            />
          </MenuItem>

          <MenuItem
            value="runwayml/stable-diffusion-v1-5"
            sx={{ textAlign: "center", width: "100%" }}
          >
            <ModelMenuItem
              value="runwayml/stable-diffusion-v1-5"
              desc={t`Stable Diffusion from Oct 20th.`}
            />
          </MenuItem>

          <MenuItem
            value="runwayml/stable-diffusion-inpainting"
            sx={{ textAlign: "center", width: "100%" }}
          >
            <ModelMenuItem
              value="runwayml/stable-diffusion-inpainting"
              desc={t`Fine-tuned SD; Best for Inpainting.`}
            />
          </MenuItem>

          <MenuItem
            value="wd-1-4-anime_e1"
            sx={{ textAlign: "center", width: "100%" }}
          >
            <ModelMenuItem
              value="wd-1-4-anime_e1"
              desc={t`Waifu Diffusion v1.4, Epoch 1, Dec 31`}
            />
          </MenuItem>

          <MenuItem
            value="hakurei/waifu-diffusion-v1-3"
            sx={{ textAlign: "center", width: "100%" }}
          >
            <ModelMenuItem
              value="hakurei/waifu-diffusion-v1-3"
              desc={t`Best for Anime.  Final Release.  Oct 6`}
            />
          </MenuItem>

          <MenuItem
            value="CompVis/stable-diffusion-v1-4"
            sx={{ textAlign: "center", width: "100%" }}
          >
            <ModelMenuItem
              value="CompVis/stable-diffusion-v1-4"
              desc={t`Original model, best for most cases.`}
            />
          </MenuItem>

          <MenuItem
            value="hakurei/waifu-diffusion"
            sx={{ textAlign: "center", width: "100%" }}
          >
            <ModelMenuItem
              value="hakurei/waifu-diffusion"
              desc={t`Anime.  Original, previous model (v1.2)`}
            />
          </MenuItem>

          {/*
          <MenuItem
            value="hakurei/waifu-diffusion-v1-3-full"
            sx={{ textAlign: "center", width: "100%" }}
          >
            <ModelMenuItem
              value="hakurei/waifu-diffusion-v1-3-full"
              desc={t`Full precision, slower, sometimes better.`}
            />
          </MenuItem>
          */}

          <MenuItem
            value="rinna/japanese-stable-diffusion"
            sx={{ textAlign: "center", width: "100%" }}
          >
            <ModelMenuItem
              value="rinna/japanese-stable-diffusion"
              desc={t`Japanese / Japanglish prompt input, style`}
            />
          </MenuItem>
        </Select>
        {false && value.startsWith("stabilityai/stable-diffusion-2") && (
          <Box sx={{ color: "red", fontSize: "80%", textAlign: "center" }}>
            Bleeding edge! Not everything works yet. Only DDIMScheduler and
            EulerDiscreteScheduler samplers work.
          </Box>
        )}
        {value.startsWith("hakurei/waifu-diffusion-v1-3") && (
          <Box sx={{ fontSize: "80%", textAlign: "center" }}>
            <a href="https://gist.github.com/harubaru/f727cedacae336d1f7877c4bbe2196e1">
              WD 1.3 Release Notes and Prompt Hints
            </a>
          </Box>
        )}
        {value.startsWith("wd-1-4-anime") && (
          <Box sx={{ fontSize: "80%", textAlign: "center" }}>
            <a href="https://gist.github.com/harubaru/8581e780a1cf61352a739f2ec2eef09b">
              WD 1.4 Release Notes and Prompt Hints
            </a>
          </Box>
        )}
        {value.startsWith("runwayml/stable-diffusion-inpainting") && (
          <Box sx={{ color: "red", fontSize: "80%", textAlign: "center" }}>
            Warning! Currently breaks easily on non-standard image sizes.
          </Box>
        )}
        {false && value === "hakurei/waifu-diffusion-v1-3" && (
          <div style={{ color: "red", fontSize: "80%" }}>
            Quality issues reported with waifu-diffusion-v1.3. We&apos;re
            working on it, but we <i>strongly</i> suggest to rather use the
            original model for now. Follow{" "}
            <a
              target="_blank"
              rel="noreferrer"
              href="https://github.com/huggingface/diffusers/issues/671"
            >
              diffusers#671
            </a>{" "}
            for details. Results are significantly worse than they should be /
            will be soon.
          </div>
        )}
      </FormControl>
    ),
    [value, setValue, defaultValue]
  );
}

function Sampler({
  value,
  setValue,
  defaultValue,
}: {
  value: ModelState["sampler"]["value"];
  setValue: ModelState["sampler"]["setValue"];
  defaultValue: typeof defaults.MODEL_ID;
}) {
  return useMemo(
    () => (
      <Grid item xs={6} sm={4} md={3} lg={2}>
        <FormControl fullWidth>
          <InputLabel id="model-select-label">
            <Trans>Sampler</Trans>
          </InputLabel>
          <Select
            id="model-select"
            label={t`Sampler`}
            labelId="model-select-label"
            value={value}
            defaultValue={defaultValue}
            onChange={(event) => setValue(event.target.value)}
            size="small"
          >
            <MenuItem
              value="DPMSolverMultistepScheduler"
              sx={{ textAlign: "center", width: "100%" }}
            >
              DPMSolverMultistepScheduler
            </MenuItem>
            <MenuItem
              value="PNDMScheduler"
              sx={{ textAlign: "center", width: "100%" }}
            >
              PNDMScheduler
            </MenuItem>

            <MenuItem
              value="DDIMScheduler"
              sx={{ textAlign: "center", width: "100%" }}
            >
              DDIMScheduler
            </MenuItem>

            <MenuItem
              value="LMSDiscreteScheduler"
              sx={{ textAlign: "center", width: "100%" }}
            >
              LMSDiscreteScheduler
            </MenuItem>

            <MenuItem
              value="EulerDiscreteScheduler"
              sx={{ textAlign: "center", width: "100%" }}
            >
              EulerDiscreteScheduler
            </MenuItem>

            <MenuItem
              value="EulerAncestralDiscreteScheduler"
              sx={{ textAlign: "center", width: "100%" }}
            >
              EulerAncestralDiscreteScheduler
            </MenuItem>
          </Select>
        </FormControl>
      </Grid>
    ),
    [value, setValue, defaultValue]
  );
}

export function randomizeSeedIfChecked(inputs: ModelState) {
  if (inputs.randomizeSeed.value) {
    const seed = Math.floor(Math.random() * MAX_SEED_VALUE);
    inputs.seed.setValue(seed);
    return seed;
  } else {
    return inputs.seed.value;
  }
}

function ProviderSelect({
  value,
  setValue,
}: // defaultValue,
{
  value: ModelState["PROVIDER_ID"]["value"];
  setValue: ModelState["PROVIDER_ID"]["setValue"];
  // defaultValue: typeof defaults.PROVIDER_ID;
}) {
  return useMemo(
    () => (
      <Grid item xs={6} sm={3} md={2} lg={1}>
        Provider
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
        </span>{" "}
        <ToggleButtonGroup
          value={value}
          exclusive
          onChange={(_, provider_id) => provider_id && setValue(provider_id)}
          aria-label="provider"
          size="small"
        >
          <ToggleButton value={1} aria-label="1">
            1
          </ToggleButton>
          <ToggleButton value={2} aria-label="2">
            2
          </ToggleButton>
        </ToggleButtonGroup>{" "}
        <Trans>Speed, stability, cost</Trans>{" "}
        <Tooltip
          title={
            <Box>
              <Trans>
                Provider 1 is our original, historic provider. Provider 2 is a
                new, additional provider - with generations costing 0.25 credits
                each - temporarily - while we&apos;re still working on this.
              </Trans>{" "}
            </Box>
          }
          enterDelay={0}
          enterTouchDelay={0}
          leaveDelay={0}
          leaveTouchDelay={4000}
        >
          <IconButton>
            <Help />
          </IconButton>
        </Tooltip>
      </Grid>
    ),
    [value, setValue /* , defaultValue */]
  );
}

export default function SDControls({
  inputs,
  go,
  randomPrompt,
  uiState,
  requestStartTime,
  requestEndTime,
}: {
  inputs: ModelState;
  go: (event: React.SyntheticEvent) => void;
  randomPrompt?: string;
  uiState: {
    dest: { value: string; set: React.Dispatch<React.SetStateAction<string>> };
  };
  requestStartTime: number | null;
  requestEndTime: number | null;
}) {
  const sharedInputs = sharedInputTextFromInputs(inputs, true);
  const getRandomPromptForModel = getRandomPrompt.bind(
    null,
    inputs.MODEL_ID.value
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

  React.useEffect(() => {
    if (!inputs.width) return;
    const timeout = setTimeout(() => {
      const width = inputs.width.value;
      if (width !== "" && Number(width) % 64 !== 0)
        inputs.width.setValue(64 * Math.round(Number(width) / 64));
    }, 1000);
    return () => clearTimeout(timeout);
  }, [inputs.width]);

  React.useEffect(() => {
    if (!inputs.height) return;
    const timeout = setTimeout(() => {
      const height = inputs.height.value;
      if (height !== "" && Number(height) % 64 !== 0)
        inputs.height.setValue(64 * Math.round(Number(height) / 64));
    }, 1000);
    return () => clearTimeout(timeout);
  }, [inputs.height]);

  React.useEffect(
    () => {
      if (
        inputs.MODEL_ID.value === "stabilityai/stable-diffusion-2" ||
        inputs.MODEL_ID.value === "stabilityai/stable-diffusion-2-1"
      ) {
        inputs.width && inputs.width.setValue(768);
        inputs.height && inputs.height.setValue(768);
        inputs.safety_checker.setValue(true);
      } else if (
        inputs.MODEL_ID.value === "stabilityai/stable-diffusion-2-base" ||
        inputs.MODEL_ID.value === "stabilityai/stable-diffusion-2-1-base"
      ) {
        inputs.width && inputs.width.setValue(512);
        inputs.height && inputs.height.setValue(512);
        inputs.safety_checker.setValue(true);
      } else if (inputs.MODEL_ID.value.startsWith("wd-1-4-anime")) {
        if (inputs.prompt.value === "")
          inputs.prompt.setValue(
            "masterpiece, best quality, high quality, absurdres "
          );
        inputs.negative_prompt.setValue(
          "worst quality, low quality, medium quality, deleted, lowres, comic, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, jpeg artifacts, signature, watermark, username, blurry"
        );
      }

      if (inputs.sampler.value == "DPMSolverMultistepScheduler") {
        inputs.num_inference_steps.setValue(20);
      }
    },
    /* eslint-disable */
    [
      inputs.MODEL_ID.value,
      inputs.sampler.value,
      // The following lines really are exactly and intentionally what we
      // want.  Maybe eslint doesn't check 3 levels deep?
      inputs.sampler.setValue,
      inputs.width?.setValue,
      inputs.height?.setValue,
      inputs.safety_checker.setValue,
    ]
  );

  return (
    <Box sx={{ my: 2 }}>
      <form onSubmit={go}>
        <Prompt
          value={inputs.prompt.value}
          setValue={inputs.prompt.setValue}
          placeholder={randomPrompt}
          getRandomPrompt={getRandomPromptForModel}
        />
        <GoButton
          disabled={!!(requestStartTime && !requestEndTime)}
          dest={uiState.dest.value}
          setDest={uiState.dest.set}
          credits={inputs.PROVIDER_ID.value === 1 ? 1 : 0.25}
        />
        <ProviderSelect
          value={inputs.PROVIDER_ID.value}
          setValue={inputs.PROVIDER_ID.setValue}
          // defaultValue={defaults.PROVIDER_ID}
        />
        <ModelSelect
          value={inputs.MODEL_ID.value}
          setValue={inputs.MODEL_ID.setValue}
          defaultValue={defaults.MODEL_ID}
        />
        {inputs.MODEL_ID.value !== "rinna/japanese-stable-diffusion" && (
          <NegativePrompt
            value={inputs.negative_prompt.value}
            setValue={inputs.negative_prompt.setValue}
            defaultValue={defaults.negative_prompt}
          />
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
            sampler={inputs.sampler.value}
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
          <Seed
            value={inputs.seed.value}
            setValue={inputs.seed.setValue}
            randomizeSeedValue={inputs.randomizeSeed.value}
            _defaultValue={defaults.seed}
          />
          <RandomizeSeed
            value={inputs.randomizeSeed.value}
            setValue={inputs.randomizeSeed.setValue}
            _defaultValue={defaults.randomizeSeed}
            setSeed={inputs.seed.setValue}
            defaultSeed={defaults.seed}
          />
          <ShareInputs
            value={inputs.shareInputs.value}
            setValue={inputs.shareInputs.setValue}
            _defaultValue={defaults.shareInputs}
            sharedInputs={sharedInputs}
          />
          {inputs.MODEL_ID.value.startsWith(
            "stabilityai/stable-diffusion-2"
          ) ? null : (
            <SafetyChecker
              value={inputs.safety_checker.value}
              setValue={inputs.safety_checker.setValue}
              _defaultValue={defaults.safety_checker}
            />
          )}
          <Sampler
            value={inputs.sampler.value}
            setValue={inputs.sampler.setValue}
            defaultValue={defaults.sampler}
          />
        </Grid>
      </form>
    </Box>
  );
}
