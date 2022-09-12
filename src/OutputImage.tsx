import React from "react";
import { toast } from "react-toastify";

import { Box, Button } from "@mui/material";
import { ContentCopy, Download, Share } from "@mui/icons-material";

const canShare =
  typeof navigator === "undefined" || // draw on SSR
  (!!navigator.share && !!navigator.canShare);

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
  prompt,
  imgSrc,
  log,
}: {
  prompt: string;
  imgSrc: string;
  log: string[];
}) {
  const imgResult = React.useRef<HTMLImageElement>(null);
  const [mouseOver, setMouseOver] = React.useState(false);
  const [aspectRatio, setAspectRatio] = React.useState("1");

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
    a.setAttribute("download", prompt + ".png");
    a.setAttribute("href-lang", "image/png");
    a.setAttribute("href", imgSrc);
    a.click();
  }

  async function share() {
    if (!imgResult.current) return;
    const blob = await fetch(imgSrc).then((r) => r.blob());
    const shareData = {
      title: prompt,
      text: prompt,
      files: [
        new File([blob], prompt + ".png", {
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
  );
}
