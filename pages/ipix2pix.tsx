import dynamic from "next/dynamic";

const IPix2Pix = dynamic(() => import("../src/IPix2Pix"), {
  ssr: false,
});

import React from "react";
import { t } from "@lingui/macro";

import { Container } from "@mui/material";

import MyAppBar from "../src/MyAppBar";

export default function Img2img() {
  return (
    <>
      <MyAppBar title={t`Instruct Pix2Pix`} />
      <Container maxWidth="lg" sx={{ my: 2 }}>
        <IPix2Pix />
      </Container>
    </>
  );
}
