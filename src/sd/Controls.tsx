import React from "react";
import { t, Trans } from "@lingui/macro";
import { db, useGongoUserId, useGongoOne } from "gongo-client-react";

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

export default function SDControls({
  inputs,
  go,
  randomPrompt,
  uiState,
}: {
  inputs: any;
  go: any;
  randomPrompt: string;
  uiState: any;
}) {
  const userId = useGongoUserId();
  const user = useGongoOne((db) =>
    db.collection("users").find({ _id: userId })
  );

  function promptKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    // Submit on "enter" but allow newline creation on shift-enter.
    if (event.key === "Enter" && !event.shiftKey) go(event);
  }

  return (
    <form onSubmit={go}>
      <TextField
        label="Prompt"
        fullWidth
        multiline
        onKeyDown={promptKeyDown}
        value={inputs.prompt.value}
        placeholder={randomPrompt}
        InputLabelProps={{ shrink: true }}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          inputs.prompt.set(event.target.value);
        }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={() => inputs.prompt.set("")}>
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
      {isDev ? (
        <Grid container sx={{ my: 1 }}>
          <Grid item xs={7} sm={8} md={9}>
            <Button variant="contained" fullWidth sx={{ my: 1 }} type="submit">
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
        <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
          <InputSlider
            label={t`Classifier-Free Guidance (Scale)`}
            value={inputs.guidance_scale.value}
            setValue={inputs.guidance_scale.set}
            defaultValue={defaults.guidance_scale}
            tooltip={
              <Box>
                <Trans>
                  How closely to follow the prompt. Lower values = more
                  creative, more variety. Higher values = more exact, may cause
                  artifacts. Values of 5 - 15 tend to work best.
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
        <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
          <InputSlider
            label={t`Number of Inference Steps`}
            value={inputs.num_inference_steps.value}
            setValue={inputs.num_inference_steps.set}
            defaultValue={defaults.num_inference_steps}
            icon={<EmojiIcon>👣</EmojiIcon>}
            tooltip={
              <Box>
                <Trans>
                  Number of denoising steps (how many times to iterate over and
                  improve the image). Larger numbers take longer to render but
                  may produce higher quality results.
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
        <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
          <InputSlider
            label={t`Width`}
            value={inputs.width.value}
            setValue={inputs.width.set}
            defaultValue={defaults.width}
            icon={<EmojiIcon>⭤</EmojiIcon>}
            step={8}
            min={8}
            max={2048}
            marks={true}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
          <InputSlider
            label={t`Height`}
            value={inputs.height.value}
            setValue={inputs.height.set}
            defaultValue={defaults.height}
            icon={<Height />}
            step={8}
            min={8}
            max={2048}
            marks={true}
          />
        </Grid>
      </Grid>
    </form>
  );
}
