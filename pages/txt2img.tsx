import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { ContentCopy, Download } from "@mui/icons-material";
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

export default function Txt2Img() {
  const [log, setLog] = React.useState([] as Array<string>);
  const imgResult = React.useRef<HTMLImageElement>(null);
  const [dest, setDest] = React.useState(
    isDev ? "banana-local" : "banana-remote"
  );
  const [mouseOver, setMouseOver] = React.useState(false);

  // Model inputs
  const [prompt, setPrompt] = React.useState("");
  const [width, setWidth] = React.useState<number | string>(512);
  const [height, setHeight] = React.useState<number | string>(512);
  const [num_inference_steps, setNumInferenceSteps] = React.useState<
    number | string
  >(50);
  const [guidance_scale, setGuidanceScale] = React.useState<number | string>(
    7.5
  );

  async function go() {
    setLog(["[WebUI] Executing..."]);
    const img = await txt2img(
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
            <img
              alt="model output"
              ref={imgResult}
              width="100%"
              height="100%"
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                display: log.length ? "none" : "block",
              }}
            ></img>
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

        <Grid container>
          <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
            <InputSlider
              label="guidance_scale"
              value={guidance_scale}
              setValue={setGuidanceScale}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
            <InputSlider
              label="num_inference_steps"
              value={num_inference_steps}
              setValue={setNumInferenceSteps}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
            <InputSlider
              label="width"
              value={width}
              setValue={setWidth}
              step={8}
              min={8}
              max={2048}
              marks={true}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
            <InputSlider
              label="height"
              value={height}
              setValue={setHeight}
              step={8}
              min={8}
              max={2048}
              marks={true}
            />
          </Grid>
        </Grid>
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
