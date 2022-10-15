import React from "react";
import { db, useGongoOne } from "gongo-client-react";
import { Button, ImageList, ImageListItem } from "@mui/material";
import { Delete, Favorite, FavoriteBorder } from "@mui/icons-material";

import Link from "./Link";
import Star from "./schemas/star";
import strObjectId from "./lib/strObjectId";
import useBreakPoint from "./lib/useBreakPoint";
import { t } from "@lingui/macro";
import asyncConfirm from "./asyncConfirm";
import Image from "next/image";

export async function destar(starId: string) {
  const res = await asyncConfirm({
    title: t`Delete this star?`,
    text: t`This cannot be undone.  All likes will be lost.`,
  });

  if (res) db.collection("stars").update(starId, { $set: { deleted: true } });

  return res;
}

function Item({ item }: { item: Star }) {
  const alt = "TODO";
  // @ts-expect-error: todo in gongo
  const userId = db.auth?.userId;
  const userLike = useGongoOne((db) =>
    db.collection("likes").find({ starId: item._id, userId })
  );
  const ownedByUser = item.userId === userId;
  const likedByUser = !!userLike && !!userLike.liked;

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

  async function itemDestar(event: React.SyntheticEvent) {
    event.preventDefault();
    destar(item._id);
  }

  return (
    <ImageListItem
      sx={{ position: "relative", aspectRatio: "1" }}
      component={Link}
      href={"/s/" + item._id}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <Image
        alt={alt}
        src={"/api/file?id=" + strObjectId(item.files.output)}
        layout="fill"
        objectFit="contain"
        sizes="(max-width: 600px) 50vw, (max-width: 900) 33vw, (max-width: 1200) 25vw,
        (max-width: 1536) 33vw, 16vw"
      />
      {ownedByUser && (
        <Button
          onClick={itemDestar}
          sx={{
            position: "absolute",
            right: 0,
            top: 0,
            m: 0,
            p: 1,
            minWidth: 0,
            color: "rgba(200,200,200,0.45)",
            "& :hover": {
              color: "red",
            },
          }}
        >
          <Delete />
        </Button>
      )}
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
            textShadow: likedByUser
              ? "0 0 2px rgba(255,255,255,0.8)"
              : undefined,
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
