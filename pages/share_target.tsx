import React from "react";
import { useRouter } from "next/router";
import { Trans } from "@lingui/macro";

import { Container, Typography } from "@mui/material";

import MyAppBar from "../src/MyAppBar";
import { itemData, ItemGrid } from "./start";

const items = itemData.filter((item) => item.href !== "/txt2img");

export default function ShareTarget() {
  const router = useRouter();

  return (
    <>
      <MyAppBar title="Share" />
      <Container>
        <Typography variant="h6" sx={{ textAlign: "center", mb: 2 }}>
          <Trans>Choose Share Target</Trans>
        </Typography>
        <ItemGrid items={items} router={router} />
      </Container>
    </>
  );
}
