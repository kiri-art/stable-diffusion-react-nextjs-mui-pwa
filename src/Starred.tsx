import React from "react";
import { db, useGongoOne, useGongoUserId } from "gongo-client-react";
import { Box, Button } from "@mui/material";
import { Delete, Favorite, FavoriteBorder, Report } from "@mui/icons-material";
// import Masonry from "@mui/lab/Masonry";
import Image from "next/legacy/image";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { t } from "@lingui/macro";
import MyMasonry from "./MyMasonry";

import Link from "./Link";
import Star from "./schemas/star";
import strObjectId from "./lib/strObjectId";
import useBreakPoint from "./lib/useBreakPoint";
import asyncConfirm from "./asyncConfirm";
import { NUM_REPORTS_UNTIL_REMOVAL } from "./lib/constants";
import StarredItem from "../pages/s/[_id]";
import { useInfiniteLoader } from "masonic";

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

export function useLike(item: Star) {
  const userId = useGongoUserId();
  const userLike = useGongoOne((db) =>
    db.collection("likes").find({ starId: item?._id || "NONE", userId })
  );
  const likedByUser = !!userLike && !!userLike.liked;

  async function like(event: React.SyntheticEvent) {
    event.preventDefault();
    event.stopPropagation();

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

  return { userId, userLike, likedByUser, like };
}

function Item({
  index,
  item,
  itemOpen: _itemOpen,
  showReported,
}: {
  index: number;
  item: Star;
  showReported: boolean;
  itemOpen: (event: React.SyntheticEvent, item: Star) => void;
}) {
  const alt = "TODO";
  const userId = useGongoUserId();
  const { likedByUser, like } = useLike(item);
  const ownedByUser = item.userId === userId;
  const aspectRatio = item.modelInputs.width
    ? item.modelInputs.width + "/" + item.modelInputs.height
    : "1";

  return React.useMemo(() => {
    async function itemDestar(event: React.SyntheticEvent) {
      event.preventDefault();
      event.stopPropagation();
      console.log(event.target);
      destar(item._id);
    }

    async function itemReport(event: React.SyntheticEvent) {
      event.preventDefault();
      event.stopPropagation();
      report(item._id);
    }

    async function itemOpen(event: React.SyntheticEvent) {
      _itemOpen(event, item);
    }

    return (
      <Link
        style={{
          position: "relative",
          aspectRatio,
          display: "block",
        }}
        href={"/s/" + item._id}
        onClick={itemOpen}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <Image
          priority={index < 4}
          alt={alt}
          src={
            (typeof window !== "undefined" ? window.origin : "") +
            "/api/file?id=" +
            strObjectId(item.files.output)
          }
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
              color:
                showReported &&
                (item.reports as number) >= NUM_REPORTS_UNTIL_REMOVAL
                  ? "red"
                  : "rgba(200,200,200,0.45)",
              "& :hover": {
                color: "red",
              },
            }}
          >
            <>
              {showReported && item.reports}
              <Report />
            </>
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
  }, [
    aspectRatio,
    item,
    index,
    like,
    likedByUser,
    ownedByUser,
    _itemOpen,
    showReported,
  ]);
}

export default function Starred({
  items,
  cols,
  loadMore,
}: {
  items: Star[];
  cols?: number;
  loadMore?: () => void;
}) {
  const router = useRouter();
  const _cols = useBreakPoint({ xs: 2, sm: 3, md: 4, lg: 5, xl: 6 });
  const itemRef = React.useRef<Star | undefined>();

  React.useEffect(() => {
    router.beforePopState((state) => {
      const match = state.url.match(/[#&]scrollY=([^#^&]+)/);
      if (match) {
        window.scrollTo({ top: parseFloat(match[1]) });
        state.options.scroll = false;
      }
      return true;
    });
  }, [router]);

  const popup = router.asPath.match(/^\/s\/(.*)$/);
  React.useEffect(() => {
    if (popup) setTimeout(() => window.scrollTo({ top: 0 }), 0);
  }, [popup]);

  const itemOpen = React.useCallback(
    async function itemOpen(event: React.SyntheticEvent, item: Star) {
      event.preventDefault();
      itemRef.current = item;
      await router.replace({ hash: "scrollY=" + window.scrollY });
      await router.push(
        { query: { ...router.query, showStarId: item._id } },
        "/s/" + item._id
      );
    },
    [router]
  );

  const MasonryItem = React.useMemo(() => {
    // @ts-expect-error: ok
    return function MasonryItem({ data, index }) {
      return (
        <Item
          index={index}
          item={data}
          showReported={!!router.query.showReported}
          itemOpen={itemOpen}
        />
      );
    };
  }, [itemOpen, router.query.showReported]);

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const maybeLoadMore = useInfiniteLoader(loadMore || (() => {}), {
    isItemLoaded: (index, items) => !!items[index],
    minimumBatchSize: 20,
    threshold: 10,
  });

  return (
    <>
      <Box
        sx={{
          display: popup ? "block" : "none",
          m: "0 !important",
          p: 0,
          position: "absolute",
          top: 0,
          left: 0,
          width: "100% !important",
          height: document.body.clientHeight,
          zIndex: 1100, // orig appmenu is 1000, menu popup is 1300
          background: "white",
        }}
      >
        {popup && <StarredItem serverItem={itemRef.current} />}
      </Box>
      {/*
      {React.useMemo(
        () => (
          <Masonry columns={cols || _cols} sx={{ my: 2 }}>
            {items.map((item) => (
              <Item
                key={item._id}
                item={item}
                showReported={!!router.query.showReported}
                itemOpen={itemOpen}
              />
            ))}
          </Masonry>
        ),
        [items, cols, _cols, itemOpen, router.query.showReported]
      )}
      */}
      <div style={{ height: "10px" }} />
      <MyMasonry
        items={items}
        render={MasonryItem}
        columnCount={cols || _cols}
        columnGutter={10}
        rowGutter={10}
        onRender={maybeLoadMore}
      />
    </>
  );
}
