import { t, Trans } from "@lingui/macro";
import { db, useGongoUserId, useGongoOne } from "gongo-client-react";
import { useRouter } from "next/router";

import { REQUIRE_REGISTRATION } from "../src/lib/client-env";
console.log({ REQUIRE_REGISTRATION });

import {
  Box,
  Button,
  Container,
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

import InputSlider from "../src/InputSlider";
import MyAppBar from "../src/MyAppBar";
import React from "react";
import txt2img from "../src/adapters/txt2img";
import OutputImage from "../src/OutputImage";

const isDev =
  process.env.NODE_ENV === "development" ||
  (typeof location === "object" && !!location.href.match(/localhost/));

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

const defaults = {
  guidance_scale: 7.5,
  num_inference_steps: 50,
  width: 512,
  height: 512,
};

const randomPrompts = [
  "Super Dog",
  "A digital illustration of a medieval town, 4k, detailed, trending in artstation, fantasy",
  "Cute and adorable ferret wizard, wearing coat and suit, steampunk, lantern, anthromorphic, Jean paptiste monge, oil painting",
  "<Scene>, skylight, soft shadows, depth of field, canon, f 1.8, 35mm",
];

function useRandomPrompt() {
  return React.useMemo(() => {
    // Do at runtime to get in local language
    return randomPrompts[Math.floor(Math.random() * randomPrompts.length)];
  }, []);
}

export default function Txt2Img() {
  const [imgSrc, setImgSrc] = React.useState<string>("");
  const [log, setLog] = React.useState([] as Array<string>);
  const [dest, setDest] = React.useState(
    isDev ? "banana-local" : "banana-remote"
  );
  const randomPrompt = useRandomPrompt();

  const userId = useGongoUserId();
  const user = useGongoOne((db) =>
    db.collection("users").find({ _id: userId })
  );
  const router = useRouter();

  // Model inputs
  const [prompt, setPrompt] = React.useState("");
  const [num_inference_steps, setNumInferenceSteps] = React.useState<
    number | string
  >(defaults.num_inference_steps);
  const [guidance_scale, setGuidanceScale] = React.useState<number | string>(
    defaults.guidance_scale
  );
  const [width, setWidth] = React.useState<number | string>(defaults.width);
  const [height, setHeight] = React.useState<number | string>(defaults.height);

  async function go(event: React.SyntheticEvent) {
    event.preventDefault();

    if (REQUIRE_REGISTRATION) {
      // TODO, record state in URL, e.g. #prompt=,etc
      if (!user) return router.push("/login?from=/txt2img");
      if (!(user.credits.free > 0 || user.credits.paid > 0))
        return router.push("/credits");
    }

    // setLog(["[WebUI] Executing..."]);
    // if (imgResult.current) imgResult.current.src = "/img/placeholder.png"; TODO
    if (!prompt) setPrompt(randomPrompt);

    await txt2img(
      {
        prompt: prompt || randomPrompt,
        width,
        height,
        num_inference_steps,
        guidance_scale,
      },
      // @ts-expect-error: TODO, db auth type
      { setLog, setImgSrc, dest, auth: db.auth.authInfoToSend() }
    );
  }

  function promptKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    // Submit on "enter" but allow newline creation on shift-enter.
    if (event.key === "Enter" && !event.shiftKey) go(event);
  }

  return (
    <>
      <MyAppBar title={t`Text to Image`} />
      <Container maxWidth="lg">
        <OutputImage prompt={prompt} imgSrc={imgSrc} log={log} />
        <form onSubmit={go}>
          <TextField
            label="Prompt"
            fullWidth
            multiline
            onKeyDown={promptKeyDown}
            value={prompt}
            placeholder={randomPrompt}
            InputLabelProps={{ shrink: true }}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              setPrompt(event.target.value);
            }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setPrompt("")}>
                    <Clear />
                  </IconButton>
                  <Tooltip
                    title={
                      <Box>
                        <Trans>
                          Description / caption of your desired image. May
                          include art styles like &apos;impressionist&apos;,
                          &apos;digital art&apos;, photographic styles and
                          lenses, and other hints.
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
                    value={dest}
                    label="Dest"
                    onChange={(e) => setDest(e.target.value as string)}
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
                value={guidance_scale}
                setValue={setGuidanceScale}
                defaultValue={defaults.guidance_scale}
                tooltip={
                  <Box>
                    <Trans>
                      How closely to follow the prompt. Lower values = more
                      creative, more variety. Higher values = more exact, may
                      cause artifacts. Values of 5 - 15 tend to work best.
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
                value={num_inference_steps}
                setValue={setNumInferenceSteps}
                defaultValue={defaults.num_inference_steps}
                icon={<EmojiIcon>👣</EmojiIcon>}
                tooltip={
                  <Box>
                    <Trans>
                      Number of denoising steps (how many times to iterate over
                      and improve the image). Larger numbers take longer to
                      render but may produce higher quality results.
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
                value={width}
                setValue={setWidth}
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
                value={height}
                setValue={setHeight}
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
        <p>COMING NEXT: img2img, inpainting.</p>
        <p>
          <a href="https://github.com/Maks-s/sd-akashic">SD Akashic Guide</a> -
          SD studies, art styles, prompts.
        </p>
        <p>
          <a href="https://lexica.art">Lexica.art</a> - Search 5M+ SD prompts
          &amp; images.
        </p>
      </Container>
    </>
  );
}
