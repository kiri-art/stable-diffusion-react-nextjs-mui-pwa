import * as React from "react";
import type { NextPage } from "next";
import { t, Trans } from "@lingui/macro";

import { Box, Button, Container, Typography } from "@mui/material";

import Link from "../src/Link";
import MyAppBar from "../src/MyAppBar";
import Copyright from "../src/Copyright";

const Home: NextPage = () => {
  return (
    <>
      <MyAppBar title={t`Home`} />
      <Container maxWidth="lg">
        <Box
          sx={{
            my: 4,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Typography variant="h6" component="h1" gutterBottom>
            stable-diffusion-react-nextjs-mui-pwa
          </Typography>
          <Button
            component={Link}
            href="/txt2img"
            variant="contained"
            sx={{ my: 1 }}
          >
            txt2img
          </Button>
          <Button
            component={Link}
            href="/about"
            variant="outlined"
            sx={{ my: 1 }}
          >
            About
          </Button>
        </Box>
        <Box
          sx={{
            p: 1,
            mb: 1,
            border: "1px solid #aaa",
            borderRadius: "5px",
            fontSize: "90%",
          }}
        >
          <Trans>
            This project is based on Free and Open Source Software. You can run
            it on your own computer for free (if you have a suitable GPU, or
            with your own Banana serverless GPU account). Want to get involved?
            See the <Link href="/about">about</Link> page.
          </Trans>
        </Box>
        <Copyright />
      </Container>
    </>
  );
};

export default Home;
