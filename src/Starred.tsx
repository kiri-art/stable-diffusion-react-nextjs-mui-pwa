import { Box, ImageList, ImageListItem } from "@mui/material";
import React from "react";
import Link from "./Link";

import Star from "./schemas/star";
import strObjectId from "./lib/strObjectId";
import useBreakPoint from "./lib/useBreakPoint";

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

export default function Starred({ items }: { items: Star[] }) {
  const cols = useBreakPoint({ xs: 2, sm: 3, md: 4, lg: 5, xl: 6 });

  return (
    <ImageList cols={cols}>
      {items.map((item) => (
        <Item key={item._id} item={item} />
      ))}
    </ImageList>
  );
}
