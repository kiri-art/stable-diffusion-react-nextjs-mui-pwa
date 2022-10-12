import { t, Trans } from "@lingui/macro";
import {
  Box,
  Button,
  Container,
  ImageList,
  ImageListItem,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { db, useGongoLive } from "gongo-client-react";
import { useRouter } from "next/router";
import React from "react";

import MyAppBar from "../src/MyAppBar";
import type { HistoryItem } from "../src/schemas/history";
import sendQueue, {
  outputImageQueue,
  maskImageQueue,
} from "../src/lib/sendQueue";
import { Delete, Edit } from "@mui/icons-material";

const MAX_HISTORY = 100;

function ImgFromBase64({
  base64,
  _size = undefined,
  alt = "image",
  onClick,
  style,
}: {
  base64: string;
  _size?: number;
  alt?: string;
  onClick?: (event: React.SyntheticEvent) => void;
  style?: React.CSSProperties;
}) {
  const src = "data:image/png;base64," + base64;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt}
      src={src}
      style={{ objectFit: "contain", cursor: "pointer", ...style }}
      width="100%" // ={size}
      // height={size}
      onClick={onClick}
    />
  );
}

function Item({ item }: { item: HistoryItem }) {
  const router = useRouter();
  const [mouseOver, setMouseOver] = React.useState(false);

  const modelOutputs = item?.result?.modelOutputs;
  if (!modelOutputs) return null;
  const base64 = modelOutputs[0].image_base64;
  const prompt = item.modelInputs.prompt;

  async function editItem(_event: React.SyntheticEvent) {
    console.log(item);

    const params = new URLSearchParams({
      ...item.callInputs,
      ...item.modelInputs,
    });

    let page = "txt2img";
    if (item.callInputs.PIPELINE.match(/Img2Img/)) page = "img2img";
    else if (item.callInputs.PIPELINE.match(/Inpaint/)) page = "inpaint";
    params.delete("PIPELINE");
    params.delete("SCHEDULER");

    const src = "data:image/png;base64," + base64;
    const blob = await fetch(src).then((res) => res.blob());

    outputImageQueue.add({
      title: item.modelInputs.prompt,
      text: item.modelInputs.prompt,
      files: [new File([blob], item.modelInputs.prompt + ".png")],
    });

    if (params.has("init_image")) {
      const src = "data:image/png;base64," + params.get("init_image");
      const blob = await fetch(src).then((res) => res.blob());
      sendQueue.add({
        title: "init_image",
        text: "init_image",
        files: [new File([blob], "init_image.png")],
      });
      params.delete("init_image");
    }

    if (params.has("mask_image")) {
      const src = "data:image/png;base64," + params.get("mask_image");
      const blob = await fetch(src).then((res) => res.blob());
      maskImageQueue.add({
        title: "mask_image",
        text: "mask_image",
        files: [new File([blob], "mask_image.png")],
      });
      params.delete("mask_image");
    }

    const url = page + "?" + params.toString();

    console.log(url);
    router.push(url);
  }

  function deleteItem(_event: React.MouseEvent<HTMLButtonElement>) {
    if (confirm(t`Are you sure?  This cannot be undone.`))
      db.collection("history").remove({ _id: item._id });
  }

  return (
    <ImageListItem
      sx={{ position: "relative" }}
      onMouseOver={() => setMouseOver(true)}
      onMouseOut={() => setMouseOver(false)}
    >
      <ImgFromBase64 base64={base64} alt={prompt} />
      {/*
      <img
        src={`${item.img}?w=164&h=164&fit=crop&auto=format`}
        srcSet={`${item.img}?w=164&h=164&fit=crop&auto=format&dpr=2 2x`}
        alt={item.title}
        loading="lazy"
      />
      */}
      {mouseOver && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
          }}
        >
          <Button
            variant="contained"
            sx={{
              position: "absolute",
              top: 10,
              right: 10,
              background: "rgba(170,170,170,0.7)",
            }}
            onClick={deleteItem}
          >
            <Delete />
          </Button>

          <Button
            variant="contained"
            sx={{
              position: "absolute",
              bottom: 10,
              right: 10,
              background: "rgba(170,170,170,0.7)",
            }}
            onClick={editItem}
          >
            <Edit />
          </Button>
        </Box>
      )}
    </ImageListItem>
  );
}

export default function History() {
  const theme = useTheme();
  const xs = useMediaQuery(theme.breakpoints.only("xs"));
  const sm = useMediaQuery(theme.breakpoints.only("sm"));
  const md = useMediaQuery(theme.breakpoints.only("md"));
  const lg = useMediaQuery(theme.breakpoints.only("lg"));
  const xl = useMediaQuery(theme.breakpoints.only("xl"));

  const items = useGongoLive((db) =>
    db.collection("history").find().sort("date", "desc")
  );

  function clear() {
    if (confirm(t`Are you sure?  This action cannot be undone`))
      db.collection("history").remove({});
  }

  let cols = 2;
  if (xs) cols = 2;
  else if (sm) cols = 3;
  else if (md) cols = 4;
  else if (lg) cols = 5;
  else if (xl) cols = 6;

  return (
    <Box>
      <MyAppBar title={t`History`} />
      <Container sx={{ my: 2 }}>
        <Trans>
          History is kept on your <b>local device only</b>. It is not backed up
          to the cloud nor visible to others (in contrast to &quot;starred&quot;
          images). Only the last {MAX_HISTORY} items are kept.
        </Trans>
        <Button onClick={clear}>
          <Trans>Clear History</Trans>
        </Button>

        <ImageList cols={cols}>
          {items.map((item) => (
            <Item key={item._id} item={item} />
          ))}
        </ImageList>
      </Container>
    </Box>
  );
}
