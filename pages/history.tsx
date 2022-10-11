import { t } from "@lingui/macro";
import { Box, Container } from "@mui/material";
import React from "react";
import MyAppBar from "../src/MyAppBar";

export default function History() {
  return (
    <Box>
      <MyAppBar title={t`History`} />
      <Container sx={{ my: 2 }}></Container>
    </Box>
  );
}
