import React from "react";
import { toast } from "react-toastify";
import { t, Trans } from "@lingui/macro";
import { db } from "gongo-client-react";

import { Box, Button, Menu, MenuItem, Tooltip } from "@mui/material";
import {
  AccessTime,
  AutoFixHigh,
  ContentCopy,
  Download,
  Share,
  Star,
} from "@mui/icons-material";
import sendQueue from "./lib/sendQueue";
import { destar } from "./Starred";

// Useful for dev
const FORCE_MOUSEOVER = false;

const BUTTON_MX = 0.5;
const BUTTON_PX = 0.5;

const canShare =
  FORCE_MOUSEOVER ||
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
  text,
  imgSrc,
  nsfw,
  log,
  requestStartTime,
  requestEndTime,
  historyId,
}: {
  text: string;
  imgSrc: string;
  nsfw: boolean;
  log: string[];
  requestStartTime: number | null;
  requestEndTime: number | null;
  historyId?: string;
}) {
  const imgResult = React.useRef<HTMLImageElement>(null);
  const [mouseOver, setMouseOver] = React.useState(false);
  const [aspectRatio, setAspectRatio] = React.useState("1");
  const [autoFixEl, setAutoFixEl] = React.useState<null | HTMLElement>(null);
  const [starring, setStarring] = React.useState(false);
  const [starId, setStarId] = React.useState("");

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
    // I.e. at the start of each new request
    if (requestStartTime && imgResult.current) {
      setStarId("");
      imgResult.current.scrollIntoView();
    }
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

  async function sendTo(target: string) {
    const blob = await fetch(imgSrc).then((r) => r.blob());
    sendQueue
      .add({
        title: text,
        text: text,
        files: [
          new File([blob], text + ".png", {
            type: "image/png",
            lastModified: new Date().getTime(),
          }),
        ],
      })
      .to(target);
  }

  async function starItem(_event: React.MouseEvent<HTMLButtonElement>) {
    // Unique to OutputImage
    const item = historyId && db.collection("history").findOne(historyId);
    if (!item) return alert("internal error, sorry");
    // Duplicated in history.tsx
    if (starId) return (await destar(starId)) && setStarId("");
    setStarring(true);
    console.log(item);
    const response = await fetch("/api/starItem", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // @ts-expect-error: TODO
        auth: db?.auth?.authInfoToSend(),
        item,
      }),
    });
    const result = await response.json();
    setStarring(false);
    console.log(result);
    db.collection("stars")._insert(result);
    setStarId(result._id);
    // OutputImage specific
    db.collection("history").update(item._id, { $set: { starId: result._id } });
  }

  return (
    <>
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
              mouseOver={FORCE_MOUSEOVER || mouseOver}
            />
          </div>
          <Log log={log} />
        </Box>{" "}
        {(FORCE_MOUSEOVER || mouseOver) && log.length === 0 && (
          <Box
            sx={{
              position: "absolute",
              top: 10,
              left: 7,
            }}
          >
            <Button
              // Duplicated in history.tsx
              variant="contained"
              sx={{
                px: BUTTON_PX,
                mx: BUTTON_MX,
                background: "rgba(170,170,170,0.7)",
                color: starId ? "yellow" : undefined,
              }}
              disabled={starring}
              onClick={starItem}
            >
              {starring ? <AccessTime /> : <Star />}
            </Button>
          </Box>
        )}
        {(FORCE_MOUSEOVER || mouseOver) && log.length === 0 && (
          <Box
            sx={{
              position: "absolute",
              bottom: 10,
              right: 7,
            }}
          >
            <Button
              variant="contained"
              sx={{ px: 0.3, mx: 0.3, background: "rgba(170,170,170,0.7)" }}
              onClick={(event: React.MouseEvent<HTMLButtonElement>) =>
                setAutoFixEl(event.currentTarget)
              }
            >
              <AutoFixHigh />
            </Button>
            <Menu
              anchorEl={autoFixEl}
              open={!!autoFixEl}
              onClose={() => setAutoFixEl(null)}
              anchorOrigin={{
                vertical: "top",
                horizontal: "center",
              }}
              transformOrigin={{
                vertical: "bottom",
                horizontal: "center",
              }}
            >
              <MenuItem onClick={() => sendTo("/inpaint")}>
                <Trans>Inpaint</Trans>
              </MenuItem>
              <MenuItem onClick={() => sendTo("/upsample")}>
                <Trans>Upsample</Trans>
              </MenuItem>
            </Menu>
            <Button
              variant="contained"
              sx={{
                px: BUTTON_PX,
                mx: BUTTON_MX,
                background: "rgba(170,170,170,0.7)",
              }}
              onClick={copy}
            >
              <ContentCopy />
            </Button>
            <Button
              variant="contained"
              sx={{
                px: BUTTON_PX,
                mx: BUTTON_MX,
                background: "rgba(170,170,170,0.7)",
              }}
              onClick={download}
            >
              <Download />
            </Button>
            {canShare && (
              <Button
                variant="contained"
                sx={{
                  px: BUTTON_PX,
                  mx: BUTTON_MX,
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
      {false && imgSrc && !imgSrc.match(/placeholder/) && (
        <Box style={{ textAlign: "center" }}>
          <span style={{ fontSize: "90%" }}>
            <Trans>SEND IMAGE TO</Trans>
          </span>

          <Button onClick={() => sendTo("/upsample")}>
            <Trans>Upsample</Trans>
          </Button>
          <Button onClick={() => sendTo("/inpaint")}>
            <Trans>Inpainting</Trans>
          </Button>
        </Box>
      )}
    </>
  );
}
