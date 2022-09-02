import * as React from "react";
import type { NextPage } from "next";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import { t, Trans } from "@lingui/macro";

import Link from "../src/Link";
import Copyright from "../src/Copyright";
import MyAppBar from "../src/MyAppBar";

const About: NextPage = () => {
  return (
    <>
      <MyAppBar title={t`About`} />
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
          <Box maxWidth="sm" sx={{ textAlign: "justify" }}>
            <p>
              <Trans>
                SD-MUI is a WEB UI frontend for{" "}
                <a href="https://stability.ai/">Stability.AI</a>&apos;s{" "}
                <a href="https://stability.ai/blog/stable-diffusion-public-release">
                  Stable Diffusion
                </a>
                . It is FOSS (Free and Open Source Software Frontend) and
                developed by the community.
              </Trans>
            </p>

            <p>
              <Trans>
                You can run it for free on your own computer (if you have a
                suitable GPU) or very cheaply via{" "}
                <a href="https://banana.dev/">Banana.Dev</a>&apos;s serverless
                GPU cloud. Get involved in our{" "}
                <a href="https://github.com/gadicc/stable-diffusion-react-nextjs-mui-pwa">
                  GitHub project
                </a>{" "}
                and let&apos;s build something awesome together.
              </Trans>
            </p>

            <p>
              <Trans>
                Rendering can be performed either 1) locally with a Banana.Dev
                docker image (recommended), 2) locally with an existing Stable
                Diffusion installation, or 3) remotely via a Banana.Dev account.
                Details in the{" "}
                <a href="https://github.com/gadicc/stable-diffusion-react-nextjs-mui-pwa#readme">
                  project README
                </a>
                .
              </Trans>
            </p>

            <p>
              Tech stack: NextJS, React, Material-UI (MUI), TypeScript, Yup,
              LinguiJS.
            </p>

            <Box sx={{ textAlign: "center", mb: 4 }}>
              <Button
                component={Link}
                variant="contained"
                href="https://github.com/gadicc/stable-diffusion-react-nextjs-mui-pwa"
              >
                GitHub Project
              </Button>{" "}
              <Button component={Link} variant="outlined" noLinkStyle href="/">
                Back Home
              </Button>
            </Box>
          </Box>
          <Copyright />
        </Box>
      </Container>
    </>
  );
};

export default About;
