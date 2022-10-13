import { t, Trans } from "@lingui/macro";
import {
  Box,
  Container,
  ImageList,
  ImageListItem,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useGongoLive, useGongoSub } from "gongo-client-react";
import React from "react";
import Link from "../src/Link";

import MyAppBar from "../src/MyAppBar";
import Star from "../src/schemas/star";

function strObjectId(obj: unknown) {
  if (typeof obj === "string") return obj;
  if (typeof obj !== "object")
    throw new Error("Not sure what to do with " + JSON.stringify(obj));
  if (obj === null) return "NULL";
  // @ts-expect-error: go home typescript
  if (obj._bsontype === "ObjectID")
    // @ts-expect-error: go home typescript
    return obj.id
      .split("")
      .map((s: string) => s.charCodeAt(0).toString(16))
      .map((s: string) => (s.length === 1 ? "0" + s : s))
      .join("");
  return obj.toString();
}

function Item({ item }: { item: Star }) {
  const [mouseOver, setMouseOver] = React.useState(false);

  const alt = "TODO";

  return (
    <ImageListItem
      sx={{ position: "relative" }}
      onMouseOver={() => setMouseOver(true)}
      onMouseOut={() => setMouseOver(false)}
      component={Link}
      href={"/s/" + item._id}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={alt}
        src={"/api/file?id=" + strObjectId(item.files.output)}
        style={{ objectFit: "contain" }}
        width="100%" // ={size}
        // height={size}
        // onClick={onClick}
      />

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
          {/*
          <Button
            variant="contained"
            sx={{
              position: "absolute",
              top: 10,
              left: 10,
              background: "rgba(170,170,170,0.7)",
              color: false ? "yellow" : undefined,
            }}
            disabled={starring}
            onClick={starItem}
          >
            {starring ? <AccessTime /> : <Star />}
          </Button>
          */}
        </Box>
      )}
    </ImageListItem>
  );
}

export default function Starred() {
  const theme = useTheme();
  const xs = useMediaQuery(theme.breakpoints.only("xs"));
  const sm = useMediaQuery(theme.breakpoints.only("sm"));
  const md = useMediaQuery(theme.breakpoints.only("md"));
  const lg = useMediaQuery(theme.breakpoints.only("lg"));
  const xl = useMediaQuery(theme.breakpoints.only("xl"));

  const items = useGongoLive((db) =>
    db.collection("stars").find().sort("date", "desc")
  );

  useGongoSub("my-stars");

  /*
  function clear() {
    if (confirm(t`Are you sure?  This action cannot be undone`))
      db.collection("history").remove({});
  }
  */

  let cols = 2;
  if (xs) cols = 2;
  else if (sm) cols = 3;
  else if (md) cols = 4;
  else if (lg) cols = 5;
  else if (xl) cols = 6;

  return (
    <Box>
      <MyAppBar title={t`Starred`} />
      <Container sx={{ my: 2 }}>
        <p>
          <i>
            <Trans>Share your Stars with the World</Trans>
          </i>
        </p>

        <Trans>
          Your <b>starred</b> items are public and appear on your profile.
        </Trans>

        <ImageList cols={cols}>
          {items.map((item) => (
            <Item key={item._id} item={item} />
          ))}
        </ImageList>
      </Container>
    </Box>
  );
}
