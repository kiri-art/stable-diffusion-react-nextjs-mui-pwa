import dynamic from "next/dynamic";

const Inpaint = dynamic(() => import("../src/Inpaint"), {
  ssr: false,
});

import React from "react";
import { t, Trans } from "@lingui/macro";

import { Container, Typography } from "@mui/material";

import MyAppBar from "../src/MyAppBar";

export default function Inpainting() {
  return (
    <>
      <MyAppBar title={t`Image to Image`} />
      <Container maxWidth="lg" sx={{ my: 2 }}>
        <Typography variant="h5">
          <Trans>Inpainting</Trans>
        </Typography>

        <p>
          <Trans>Coming Soon</Trans>
        </p>

        <p>This doesn't work yet but it's almost done :)</p>

        <Inpaint />
      </Container>
    </>
  );
}
