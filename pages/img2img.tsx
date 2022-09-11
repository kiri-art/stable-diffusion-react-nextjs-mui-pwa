import dynamic from "next/dynamic";

const Inpaint = dynamic(() => import("../src/Img2img"), {
  ssr: false,
});

import React from "react";
import { t, Trans } from "@lingui/macro";

import { Container, Typography } from "@mui/material";

import MyAppBar from "../src/MyAppBar";

export default function Img2img() {
  return (
    <>
      <MyAppBar title={t`Image to Image`} />
      <Container maxWidth="lg" sx={{ my: 2 }}>
        <Typography variant="h5">
          <Trans>Image to Image</Trans>
        </Typography>

        <Inpaint />
      </Container>
    </>
  );
}
