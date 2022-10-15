import * as React from "react";
import type { NextPage } from "next";
import { t, Trans } from "@lingui/macro";

import { Box, Button, Container } from "@mui/material";

import Link from "../src/Link";
import MyAppBar from "../src/MyAppBar";
import Copyright from "../src/Copyright";
import { useGongoLive, useGongoSub } from "gongo-client-react";
import Starred from "../src/Starred";

const Home: NextPage = () => {
  const items = useGongoLive((db) =>
    db
      .collection("stars")
      .find({ deleted: { $ne: true } })
      .sort("date", "desc")
      .limit(100)
  );
  useGongoSub("stars");

  return (
    <>
      <MyAppBar title={t`Home`} />
      <Container maxWidth="lg" sx={{ my: 2 }}>
        <Box sx={{ textAlign: "center" }}>
          <Button component={Link} href="/start">
            <Trans>Quick Start</Trans>
          </Button>
        </Box>

        <br />

        <Box sx={{ textAlign: "center" }}>
          <Trans>Recently Starred</Trans>
          <br />
          <Box sx={{ fontSize: "80%" }}>
            <Trans>Star your images to have them appear here too!</Trans>
          </Box>
        </Box>

        <Starred items={items} />

        <Copyright />
      </Container>
    </>
  );
};

export default Home;
