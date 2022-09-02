import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { t, Trans } from "@lingui/macro";

import {
  Box,
  Button,
  Container,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import { ContentCopy, Download, Height, Scale } from "@mui/icons-material";

import InputSlider from "../src/InputSlider";
import MyAppBar from "../src/MyAppBar";
import React from "react";
import txt2img from "../src/adapters/txt2img";

const isDev =
  process.env.NODE_ENV === "development" ||
  (typeof location === "object" && !!location.href.match(/localhost/));

function Timer() {
  const [s, setS] = React.useState(0);

  React.useEffect(() => {
    const timeout = setTimeout(() => setS(s + 0.1), 100);
    return () => clearTimeout(timeout);
  }, [s]);

  return <div>{s.toFixed(1)}</div>;
}

function Log({ log }: { log: string[] }) {
  const ref = React.useRef<HTMLPreElement>(null);

  React.useEffect(() => {
    if (ref.current) ref.current.scrollIntoView(false);
  });

  return log.length ? <pre ref={ref}>{log.join("\n")}</pre> : null;
}

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

export default function Txt2Img() {
  const [log, setLog] = React.useState([] as Array<string>);
  const imgResult = React.useRef<HTMLImageElement>(null);
  const [dest, setDest] = React.useState(
    isDev ? "banana-local" : "banana-remote"
  );
  const [mouseOver, setMouseOver] = React.useState(false);

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

  async function go() {
    setLog(["[WebUI] Executing..."]);
    if (imgResult.current) imgResult.current.src = "/img/placeholder.png";
    await txt2img(
      { prompt, width, height, num_inference_steps, guidance_scale },
      { setLog, imgResult, dest }
    );
  }

  async function copy() {
    if (!imgResult.current) return;
    const blob = await fetch(imgResult.current.src).then((r) => r.blob());
    const item = new ClipboardItem({ "image/png": blob });
    await navigator.clipboard.write([item]);
    toast("✅ PNG copied to clipboard");
  }

  async function download() {
    if (!imgResult.current) return;
    //const blob = await fetch(imgResult.current.src).then(r => r.blob());
    const a = document.createElement("a");
    a.setAttribute("download", prompt + ".png");
    a.setAttribute("href-lang", "image/png");
    a.setAttribute("href", imgResult.current.src);
    a.click();
  }

  return (
    <>
      <MyAppBar title="txt2img" />
      <Container maxWidth="lg">
        <Box
          sx={{
            mt: 1,
            mb: 2,
            width: "100%",
            height: "calc(100vw - 46px)",
            maxHeight: 512,
          }}
        >
          <Box
            onMouseOver={() => setMouseOver(true)}
            onMouseOut={() => setMouseOver(false)}
            sx={{
              width: "calc(100vw - 46px)",
              maxWidth: 512,
              height: "100%",
              position: "relative",
              margin: "auto",
              border: "1px solid #ddd",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="model output"
              ref={imgResult}
              width="100%"
              height="100%"
              src="/img/placeholder.png"
              style={{
                position: "absolute",
                left: 0,
                top: 0,
              }}
            />
            {mouseOver && log.length === 0 && (
              <Box
                sx={{
                  position: "absolute",
                  bottom: 10,
                  right: 10,
                }}
              >
                <Button
                  variant="contained"
                  sx={{ px: 0.5, mx: 0.5, background: "rgba(170,170,170,0.7)" }}
                  onClick={copy}
                >
                  <ContentCopy />
                </Button>
                <Button
                  variant="contained"
                  sx={{ px: 0.5, mx: 0.5, background: "rgba(170,170,170,0.7)" }}
                  onClick={download}
                >
                  <Download />
                </Button>
              </Box>
            )}
            {log.length > 0 && (
              <Box
                sx={{
                  py: 0.5,
                  px: 2,
                  width: "100%",
                  height: "100%",
                  position: "absolute",
                  left: 0,
                  top: 0,
                  overflow: "auto",
                }}
              >
                <div style={{ position: "absolute", right: 10, top: 10 }}>
                  <Timer />
                </div>
                <Log log={log} />
              </Box>
            )}
          </Box>
        </Box>
        <TextField
          label="Prompt"
          fullWidth
          multiline
          value={prompt}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setPrompt(event.target.value);
          }}
        />
        {isDev ? (
          <Grid container sx={{ my: 1 }}>
            <Grid item xs={7} sm={8} md={9}>
              <Button variant="contained" fullWidth sx={{ my: 1 }} onClick={go}>
                Go
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
                    cause artifacts. Values of 5 - 15 tend to work best.{" "}
                    <a href="https://benanne.github.io/2022/05/26/guidance.html">
                      Learn more
                    </a>
                  </Trans>
                </Box>
              }
              icon={<Scale />}
              min={1}
              max={50}
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
                    and improve the image). Larger numbers take longer to render
                    but may produce higher quality results.{" "}
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
        <p>
          <a href="https://github.com/Maks-s/sd-akashic">SD Akashic Guide</a>
        </p>
      </Container>
      <ToastContainer
        position="bottom-center"
        autoClose={1500}
        hideProgressBar
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss={false}
        draggable={false}
        pauseOnHover
      />
    </>
  );
}
