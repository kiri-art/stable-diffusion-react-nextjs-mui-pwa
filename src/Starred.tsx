import React from "react";
import { db, useGongoOne, useGongoUserId } from "gongo-client-react";
import { Button } from "@mui/material";
import { Delete, Favorite, FavoriteBorder, Report } from "@mui/icons-material";
import Masonry from "@mui/lab/Masonry";
import Image from "next/image";
import { useInView } from "react-hook-inview";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { t } from "@lingui/macro";

import Link from "./Link";
import Star from "./schemas/star";
import strObjectId from "./lib/strObjectId";
import useBreakPoint from "./lib/useBreakPoint";
import asyncConfirm from "./asyncConfirm";
import { NUM_REPORTS_UNTIL_REMOVAL } from "./lib/constants";

export async function destar(starId: string) {
  const res = await asyncConfirm({
    title: t`Delete this star?`,
    text: t`This cannot be undone.  All likes will be lost.`,
  });

  if (res) db.collection("stars").update(starId, { $set: { deleted: true } });

  return res;
}

export async function report(starId: string) {
  const ok = await asyncConfirm({
    title: t`Report this star?`,
    text: t`Items reported by ${NUM_REPORTS_UNTIL_REMOVAL} users will be automatically removed.`,
  });

  if (!ok) return false;

  const result = await db.call("reportStar", { starId });
  console.log(result);

  if (result.status !== "OK")
    return toast(t`An error occured: ` + result.status + " " + result.message);

  if ((result.NUM_REPORTS as number) >= NUM_REPORTS_UNTIL_REMOVAL)
    return toast(
      t`Item was reported ${result.NUM_REPORTS} times has been removed.  Thank you!`
    );

  return toast(
    t`Item was reported ${result.NUM_REPORTS} times.  Thanks for reporting!`
  );
}

function Item({
  item,
  scrolled,
}: {
  item: Star;
  scrolled?: React.MutableRefObject<number>;
}) {
  const alt = "TODO";
  const userId = useGongoUserId();
  const userLike = useGongoOne((db) =>
    db.collection("likes").find({ starId: item._id, userId })
  );
  const ownedByUser = item.userId === userId;
  const likedByUser = !!userLike && !!userLike.liked;
  const aspectRatio = item.modelInputs.width
    ? item.modelInputs.width + "/" + item.modelInputs.height
    : "1";

  const router = useRouter();

  const [ref] = useInView({
    threshold: 1,
    onEnter: () => {
      if (
        !(scrolled && scrolled.current && Date.now() > scrolled.current + 1000)
      )
        return;
      router
        .replace({
          hash: item._id,
        })
        .catch((e) => {
          if (!e.cancelled) throw e;
        });
    },
  });

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

  async function itemReport(event: React.SyntheticEvent) {
    event.preventDefault();
    report(item._id);
  }

  return (
    <Link
      ref={ref}
      style={{ position: "relative", aspectRatio }}
      href={"/s/" + item._id}
    >
      <div id={"item_" + item._id} style={{ scrollMarginTop: "8px" }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <Image
        alt={alt}
        src={"/api/file?id=" + strObjectId(item.files.output)}
        layout="fill"
        objectFit="contain"
        sizes="(max-width: 600px) 50vw, (max-width: 900) 33vw, (max-width: 1200) 25vw,
        (max-width: 1536) 33vw, 16vw"
      />
      {ownedByUser && false ? (
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
      ) : (
        <Button
          onClick={itemReport}
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
          <Report />
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
    </Link>
  );
}

export default function Starred({
  items,
  cols,
}: {
  items: Star[];
  cols?: number;
}) {
  const _cols = useBreakPoint({ xs: 2, sm: 3, md: 4, lg: 5, xl: 6 });
  const router = useRouter();
  const scrolled = React.useRef(Date.now());

  React.useLayoutEffect(() => {
    const match = router.asPath.match(/#(.*)$/);
    if (match && match[1]) {
      const div = document.getElementById("item_" + match[1]);
      setTimeout(() => div && div.scrollIntoView(), 300);
      scrolled.current = Date.now();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Masonry columns={cols || _cols} sx={{ my: 2 }}>
      {items.map((item) => (
        <Item key={item._id} item={item} scrolled={scrolled} />
      ))}
    </Masonry>
  );
}
