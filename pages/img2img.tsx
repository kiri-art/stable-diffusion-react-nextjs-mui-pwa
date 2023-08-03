import dynamic from "next/dynamic";

const Img2Img = dynamic(() => import("../src/Img2img"), {
  ssr: false,
});

import React from "react";
import { t } from "@lingui/macro";

import { Container } from "@mui/material";

import MyAppBar from "../src/MyAppBar";

export default function Img2img() {
  return (
    <>
      <MyAppBar title={t`Image to Image`} />
      <Container maxWidth="lg" sx={{ my: 2 }}>
        <Img2Img />
      </Container>
    </>
  );
}
