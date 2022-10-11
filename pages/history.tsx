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

const MAX_HISTORY = 100;

function ImgFromBase64({
  base64,
  _size = undefined,
  alt = "image",
  onClick,
}: {
  base64: string;
  _size?: number;
  alt?: string;
  onClick: (event: React.SyntheticEvent) => void;
}) {
  const src = "data:image/png;base64," + base64;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={alt}
      src={src}
      style={{ objectFit: "contain", cursor: "pointer" }}
      width="100%" // ={size}
      // height={size}
      onClick={onClick}
    />
  );
}

function Item({ item }: { item: HistoryItem }) {
  const router = useRouter();

  const modelOutputs = item?.result?.modelOutputs;
  if (!modelOutputs) return null;
  const base64 = modelOutputs[0].image_base64;
  const prompt = item.modelInputs.prompt;

  function click(_event: React.SyntheticEvent) {
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

    const url = page + "?" + params.toString();

    console.log(url);
    router.push(url);
  }

  return (
    <ImageListItem>
      <ImgFromBase64 base64={base64} alt={prompt} onClick={click} />
      {/*
      <img
        src={`${item.img}?w=164&h=164&fit=crop&auto=format`}
        srcSet={`${item.img}?w=164&h=164&fit=crop&auto=format&dpr=2 2x`}
        alt={item.title}
        loading="lazy"
      />
      */}
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
