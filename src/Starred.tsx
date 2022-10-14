import React from "react";
import { db, useGongoOne } from "gongo-client-react";
import { Button, ImageList, ImageListItem } from "@mui/material";
import { Favorite, FavoriteBorder } from "@mui/icons-material";

import Link from "./Link";
import Star from "./schemas/star";
import strObjectId from "./lib/strObjectId";
import useBreakPoint from "./lib/useBreakPoint";

function Item({ item }: { item: Star }) {
  const alt = "TODO";
  const userLike = useGongoOne((db) =>
    db.collection("likes").find({ starId: item._id })
  );
  const likedByUser = !!userLike && !!userLike.liked;

  // @ts-expect-error: todo in gongo
  const userId = db.auth?.userId;

  async function like(event: React.SyntheticEvent) {
    event.preventDefault();
    if (!userId) return alert("log in first");

    if (userLike)
      db.collection("likes").update(userLike._id, {
        $set: { liked: !likedByUser },
      });
    else
      db.collection("likes").insert({
        userId,
        starId: item._id,
        liked: true,
        __ObjectIDs: ["userId", "starId"],
      });
  }

  return (
    <ImageListItem
      sx={{ position: "relative" }}
      component={Link}
      href={"/s/" + item._id}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={alt}
        src={"/api/file?id=" + strObjectId(item.files.output)}
        style={{ objectFit: "contain" }}
        width="100%"
      />
      <Button
        onClick={like}
        sx={{
          position: "absolute",
          left: 0,
          top: 0,
          m: 0,
          p: 1,
          minWidth: 0,
        }}
      >
        <span
          style={{
            color: likedByUser ? "red" : "rgba(200,200,200,0.5)",
          }}
        >
          {likedByUser ? <Favorite /> : <FavoriteBorder />}
        </span>
        <span
          style={{
            color: likedByUser ? "#333" : "rgba(200,200,200,0.5)",
            position: "relative",
            top: "-3px",
            marginLeft: "3px",
            textShadow: likedByUser && "0 0 2px rgba(255,255,255,0.8)",
          }}
        >
          {item.likes}
        </span>
      </Button>
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
