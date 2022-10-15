import React from "react";
import { useRouter } from "next/router";
import { useGongoOne } from "gongo-client-react";
import { Box, Container } from "@mui/material";
import MyAppBar from "../../src/MyAppBar";
import { Trans } from "@lingui/macro";
import Link from "../../src/Link";
import strObjectId from "../../src/lib/strObjectId";

export default function StarredItem() {
  const router = useRouter();
  const { _id } = router.query;

  const item = useGongoOne((db) => db.collection("stars").find({ _id }));
  if (!item) return <div>Loading...</div>;

  const modelInputs = item.modelInputs;

  // TODO, need to store w/h in result for other pipelines that don't specify.
  const aspectRatio =
    modelInputs.width && modelInputs.height
      ? modelInputs.width + "/" + modelInputs.height
      : undefined;

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
        />
        <p>
          By: <Link href={"/p/" + item.userId}>{item.userId}</Link> (coming
          soon)
        </p>
        <p>Liked by: {item.likes} users</p>

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
          <Trans>Steps</Trans>: {modelInputs.num_inference_steps}
        </p>
      </Container>
    </Box>
  );
}
