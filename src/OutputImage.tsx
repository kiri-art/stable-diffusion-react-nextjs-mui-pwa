import React from "react";
import { toast } from "react-toastify";
import { t } from "@lingui/macro";

import { Box, Button, Tooltip } from "@mui/material";
import { ContentCopy, Download, Share } from "@mui/icons-material";

import { ModelState } from "./sd/useModelState";

const canShare =
  typeof navigator === "undefined" || // draw on SSR
  (!!navigator.share && !!navigator.canShare);

function Timer({
  requestStartTime,
  requestEndTime,
  mouseOver,
}: {
  requestStartTime: number | null;
  requestEndTime: number | null;
  mouseOver: boolean;
}) {
  const [s, setS] = React.useState(0);

  React.useEffect(() => {
    if (!requestStartTime) return;
    if (requestEndTime) return setS((requestEndTime - requestStartTime) / 1000);
    setS((Date.now() - requestStartTime) / 1000);
    const interval = setInterval(
      () => setS((Date.now() - requestStartTime) / 1000),
      100
    );
    return () => {
      clearInterval(interval);
    };
  }, [requestStartTime, requestEndTime]);

  if (!requestStartTime || (requestEndTime && !mouseOver)) return null;

  const style = requestEndTime
    ? { color: "white", textShadow: "0 0 4px black" }
    : { color: "black" };

  return <div style={style}>{s.toFixed(1)}</div>;
}

function Log({ log }: { log: string[] }) {
  const ref = React.useRef<HTMLPreElement>(null);

  React.useEffect(() => {
    const timer = ref.current;
    if (timer) {
      // const parentDiv = timer?.parentNode as HTMLDivElement;
      // if (parentDiv.scrollHeight > parentDiv.clientHeight - )
      // timer.scrollIntoView(false);
      // actually, we need to listen to scroll status, to see if
      // user scrolled away from bottom at some point, toggle.
    }
  });

  return log.length ? <pre ref={ref}>{log.join("\n")}</pre> : null;
}

export default function OutputImage({
  inputs,
  imgSrc,
  nsfw,
  log,
  requestStartTime,
  requestEndTime,
}: {
  inputs: ModelState;
  imgSrc: string;
  nsfw: boolean;
  log: string[];
  requestStartTime: number | null;
  requestEndTime: number | null;
}) {
  const imgResult = React.useRef<HTMLImageElement>(null);
  const [mouseOver, setMouseOver] = React.useState(false);
  const [aspectRatio, setAspectRatio] = React.useState("1");

  const prompt = inputs.prompt.value;
  const text =
    prompt +
    (inputs.shareInputs.value
      ? `, CFG: ${inputs.guidance_scale.value}, Steps: ${inputs.num_inference_steps.value}, Seed: ${inputs.seed.value}`
      : "");

  function onLoad(_event: React.SyntheticEvent<HTMLImageElement>) {
    const img = imgResult.current;
    if (!img) throw new Error("no imgResult.current");
    setAspectRatio(img.naturalWidth + " / " + img.naturalHeight);
  }

  async function copy() {
    if (!imgResult.current) return;
    const blob = await fetch(imgSrc).then((r) => r.blob());
    const item = new ClipboardItem({ "image/png": blob });
    await navigator.clipboard.write([item]);
    toast("✅ PNG copied to clipboard");
  }

  async function download() {
    if (!imgResult.current) return;
    //const blob = await fetch(imgResult.current.src).then(r => r.blob());
    const a = document.createElement("a");
    a.setAttribute("download", text.replace(/:/g, " ") + ".png");
    a.setAttribute("href-lang", "image/png");
    a.setAttribute("href", imgSrc);
    a.click();
  }

  React.useEffect(() => {
    if (requestStartTime && imgResult.current)
      imgResult.current.scrollIntoView();
  }, [requestStartTime, requestEndTime]);

  async function share() {
    if (!imgResult.current) return;
    const blob = await fetch(imgSrc).then((r) => r.blob());
    const shareData = {
      title: text,
      text: text,
      files: [
        new File([blob], text + ".png", {
          type: "image/png",
          lastModified: new Date().getTime(),
        }),
      ],
    };
    if (navigator.canShare && navigator.canShare(shareData)) {
      navigator.share(shareData);
    } else {
      toast("Sharing failed");
    }
  }

  return (
    <Box
      onMouseOver={() => setMouseOver(true)}
      onMouseOut={() => setMouseOver(false)}
      sx={{
        my: 2,
        width: "100%",
        maxWidth: 512,
        marginLeft: "auto",
        marginRight: "auto",
        aspectRatio,
        position: "relative",
        border: "1px solid black",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt="model output"
        ref={imgResult}
        width="100%"
        height="100%"
        src={imgSrc || "/img/placeholder.png"}
        onLoad={onLoad}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          scrollMarginTop: "73px",
        }}
      />
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
          <Timer
            requestStartTime={requestStartTime}
            requestEndTime={requestEndTime}
            mouseOver={mouseOver}
          />
        </div>
        <Log log={log} />
      </Box>{" "}
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
          {canShare && (
            <Button
              variant="contained"
              sx={{
                px: 0.5,
                mx: 0.5,
                background: "rgba(170,170,170,0.7)",
              }}
              onClick={share}
            >
              <Share />
            </Button>
          )}
        </Box>
      )}
      {imgSrc && !imgSrc.match(/placeholder/) && nsfw && (
        <Box
          sx={{
            position: "absolute",
            left: 0,
            top: 0,
            padding: 1,
          }}
        >
          <Tooltip
            title={t`Potential NSFW content detected. A black image was returned instead. Try again with a different prompt and/or seed.`}
          >
            <span>🔞{imgSrc}</span>
          </Tooltip>
        </Box>
      )}
    </Box>
  );
}
