import React from "react";
import { useRouter } from "next/router";
import { useGongoOne, useGongoSub } from "gongo-client-react";
import { Box, Container, IconButton } from "@mui/material";
import { t, Trans } from "@lingui/macro";
// import { GetServerSideProps } from "next";

import MyAppBar from "../../src/MyAppBar";
import Link from "../../src/Link";
import strObjectId from "../../src/lib/strObjectId";
// import { db as serverDb, ObjectId } from "../../src/api-lib/db";
import { FavoriteBorder, Share, Edit, Favorite } from "@mui/icons-material";
import { useLike } from "../../src/Starred";
import { editItem } from "../history";
import sharedInputTextFromInputs from "../../src/lib/sharedInputTextFromInputs";
import { toast } from "react-toastify";
import Star from "../../src/schemas/star";

const canShare =
  typeof navigator === "undefined" || // draw on SSR
  (!!navigator.share && !!navigator.canShare);

/*
export const getServerSideProps: GetServerSideProps = async ({
  query,
  res,
}) => {
  if (!serverDb || !query._id) return { props: {} };
  const itemRaw = await serverDb
    .collection("stars")
    .findOne({ _id: new ObjectId(query._id as string) });
  if (!itemRaw) return { props: {} };

  res.setHeader(
    "Cache-Control",
    "public, s-maxage=10, stale-while-revalidate=59"
  );

  const item = {
    ...itemRaw,
    _id: itemRaw._id.toString(),
    userId: itemRaw.userId.toString(),
    date: itemRaw.date.toISOString(),
    files: Object.fromEntries(
      Object.entries(itemRaw.files as Record<string, ObjectId>).map(
        ([key, value]) => [key, value.toString()]
      )
    ),
  };

  item._id = item._id.toString();
  item.userId = item.userId.toString();
  for (const key of Object.keys(item.files))
    item.files[key] = item.files[key].toString();

  console.log({ item });
  return { props: { serverItem: item } };
};
*/

export default function StarredItem({ serverItem }: { serverItem?: Star }) {
  const imgRef = React.useRef<HTMLImageElement>(null);
  const router = useRouter();
  const _id = router.query._id || router.query.showStarId;

  const clientItem = useGongoOne(
    // @ts-expect-error: testing
    (db) => _id && db.collection("stars").find({ _id })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) as any;
  // TODO, just testing.

  const item = (serverItem || clientItem) as typeof clientItem;

  const userProfile = useGongoOne((db) =>
    db.collection("userProfiles").find({ _id: item && item.userId })
  );

  // TODO, gongo should accept "false" args to ignore.
  // @ts-expect-error: testing
  useGongoSub(_id && "star", { starId: _id });

  const { like, likedByUser } = useLike(item);

  // console.log({ _id, item, userProfile, like, likedByUser });

  async function editItemClick(_event: React.SyntheticEvent) {
    if (!imgRef.current) return;
    const res = await fetch(imgRef.current.src);
    const blob = await res.blob();
    const reader = new FileReader();
    const result: FileReader["result"] = await new Promise((resolve) => {
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
    if (!result) return;
    const base64 = result.toString().split(",")[1];
    editItem(item, base64, router);
  }

  if (!item) return <div>Loading...</div>;
  if (typeof item.date === "string") item.date = new Date(item.date);

  const modelInputs = item.modelInputs;
  const callInputs = item.callInputs;

  // TODO, need to store w/h in result for other pipelines that don't specify.
  const aspectRatio =
    modelInputs.width && modelInputs.height
      ? modelInputs.width + "/" + modelInputs.height
      : undefined;

  const styleVAM = { verticalAlign: "middle" };

  async function share() {
    if (!imgRef.current) return;

    const simulatedModelState = {
      prompt: { value: modelInputs.prompt || "" },
      shareInputs: { value: true },
      guidance_scale: { value: modelInputs.guidance_scale },
      num_inference_steps: { value: modelInputs.num_inference_steps },
      seed: { value: modelInputs.seed as number },
      negative_prompt: { value: modelInputs.negative_prompt || "" },
    };
    const text = sharedInputTextFromInputs(
      simulatedModelState,
      true,
      "\n\n",
      true
    );

    const blob = await fetch(imgRef.current.src).then((r) => r.blob());

    const url = location.href;
    const preText = t`See all inputs and remix at ${url}`;

    const shareData = {
      title: t`See my Kiri.Art creation!`,
      // end with "\n\n" since many apps place {url} just below.
      text: preText + "\n\n" + text + "\n\n",
      url,
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

  return (
    <Box>
      <MyAppBar title="Starred Item" />
      <Container sx={{ my: 2 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt={modelInputs.prompt}
          src={"/api/file?id=" + strObjectId(item.files.output)}
          style={{ maxWidth: "100%", border: "1px solid black", aspectRatio }}
          width="100%"
          ref={imgRef}
        />
        <Box>
          <IconButton size="small" onClick={like}>
            {likedByUser ? (
              <Favorite style={{ ...styleVAM, color: "red" }} />
            ) : (
              <FavoriteBorder style={styleVAM} />
            )}{" "}
            <span style={styleVAM}>{item.likes}</span>
          </IconButton>{" "}
          {canShare && (
            <IconButton size="small" onClick={share}>
              <Share style={styleVAM} />
            </IconButton>
          )}{" "}
          <IconButton size="small" onClick={editItemClick}>
            <Edit style={styleVAM} />
          </IconButton>
        </Box>
        <p>
          By:{" "}
          {userProfile?.username ? (
            <Link href={"/" + userProfile.username}>
              {userProfile.username}
            </Link>
          ) : (
            <Link href={"/p/" + item.userId}>
              <Trans>Anonymous User</Trans>
            </Link>
          )}
        </p>
        <p>Liked by: {item.likes} users</p>

        <p>
          <Trans>Model</Trans>: {callInputs.MODEL_ID}
        </p>

        <p>
          <Trans>Prompt</Trans>: {modelInputs.prompt}
        </p>

        <p>
          <Trans>Negative Prompt</Trans>: {modelInputs.negative_prompt}
        </p>
        <p>
          <Trans>CFG</Trans>: {modelInputs.guidance_scale}
        </p>

        <p>
          <Trans>Sheduler</Trans>: {callInputs.SCHEDULER}
        </p>

        <p>
          <Trans>Steps</Trans>: {modelInputs.num_inference_steps}
        </p>
        <p>
          <Trans>Seed</Trans>: {modelInputs.seed}
        </p>

        {/* not correctly stored yet
        <p>
          <Trans>Pipeline</Trans>: {callInputs.PIPELINE}
          {callInputs.custom_pipeline_method &&
            " (" + callInputs.custom_pipeline_method + ")"}
        </p>
          */}
      </Container>
    </Box>
  );
}
