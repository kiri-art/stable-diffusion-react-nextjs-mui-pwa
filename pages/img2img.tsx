import React from "react";
import { t, Trans } from "@lingui/macro";

import { Container, Typography } from "@mui/material";

import MyAppBar from "../src/MyAppBar";

export default function Orders() {
  return (
    <>
      <MyAppBar title={t`Image to Image`} />
      <Container maxWidth="lg" sx={{ my: 2 }}>
        <Typography variant="h5">
          <Trans>Image to Image</Trans>
        </Typography>

        <p>
          <Trans>Coming Soon</Trans>
        </p>
      </Container>
    </>
  );
}
