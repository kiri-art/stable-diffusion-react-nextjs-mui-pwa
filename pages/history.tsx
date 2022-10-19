import { t, Trans } from "@lingui/macro";
import { db, useGongoLive, useGongoUserId } from "gongo-client-react";
import { useRouter } from "next/router";
import React from "react";
import {
  Box,
  Button,
  Container,
  ImageList,
  ImageListItem,
} from "@mui/material";
import { AccessTime, Delete, Edit, Star } from "@mui/icons-material";

import MyAppBar from "../src/MyAppBar";
import type { HistoryItem } from "../src/schemas/history";
import sendQueue, {
  outputImageQueue,
  maskImageQueue,
} from "../src/lib/sendQueue";
import Link from "../src/Link";
import useBreakPoint from "../src/lib/useBreakPoint";
import { destar } from "../src/Starred";
import asyncConfirm from "../src/asyncConfirm";
import sanitizeFilename from "sanitize-filename";

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
  const [starring, setStarring] = React.useState(false);
  const [starId, setStarId] = React.useState(item.starId || "");

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
      files: [
        new File([blob], sanitizeFilename(item.modelInputs.prompt + ".png")),
      ],
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

  async function deleteItem(_event: React.MouseEvent<HTMLButtonElement>) {
    if (await asyncConfirm(t`Are you sure?  This cannot be undone.`))
      db.collection("history").remove({ _id: item._id });
  }

  async function starItem(_event: React.MouseEvent<HTMLButtonElement>) {
    // Duplicated in OutputImage
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
    // history.tsx specific
    const historyId = item._id as string;
    db.collection("history").update(historyId, {
      $set: { starId: result._id },
    });
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
            // Duplicated in OutputImage.tsx
            variant="contained"
            sx={{
              position: "absolute",
              top: 10,
              left: 10,
              background: "rgba(170,170,170,0.7)",
              color: starId ? "yellow" : undefined,
            }}
            disabled={starring}
            onClick={starItem}
          >
            {starring ? <AccessTime /> : <Star />}
          </Button>

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
  const userId = useGongoUserId();
  const cols = useBreakPoint({ xs: 2, sm: 3, md: 4, lg: 5, xl: 6 });

  const items = useGongoLive((db) =>
    db.collection("history").find().sort("date", "desc")
  );

  async function clear() {
    if (await asyncConfirm(t`Are you sure?  This action cannot be undone`))
      db.collection("history").remove({});
  }

  return (
    <Box>
      <MyAppBar title={t`History`} />
      <Container sx={{ my: 2 }}>
        <Trans>
          History is kept on your <b>local device only</b>. It is not backed up
          to the cloud nor visible to others (in contrast to your{" "}
          <Link href={"/" + userId}>starred</Link> images). Only the last{" "}
          {MAX_HISTORY} items are kept.
        </Trans>
        <Button size="small" onClick={clear}>
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
