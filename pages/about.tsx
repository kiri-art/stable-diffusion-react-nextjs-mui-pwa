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
                <b>KIRI.ART</b> (&quot;SD-MUI&quot;) is a WEB UI frontend for{" "}
                <a href="https://stability.ai/">Stability.AI</a>&apos;s{" "}
                <a href="https://stability.ai/blog/stable-diffusion-public-release">
                  Stable Diffusion
                </a>
                .
              </Trans>{" "}
              <Trans>
                It&apos;s focus is a simple, <b>zero-setup</b>,{" "}
                <b>mobile-first</b> interface that&apos;s <b>easy-to-share</b>{" "}
                with friends.
              </Trans>{" "}
              <Trans>
                It is Free and Open Source Software (&quot;FOSS&quot;) developed
                by the community.
              </Trans>
            </p>

            <p>
              <Trans>
                It can be used here instantly with free &amp; paid credits, run
                for free on your own computer (if you have a suitable GPU) or
                very cheaply via <a href="https://banana.dev/">banana.dev</a>
                &apos;s serverless GPU cloud (see the{" "}
                <a href="https://github.com/gadicc/stable-diffusion-react-nextjs-mui-pwa#readme">
                  README
                </a>{" "}
                for details). Get involved in our{" "}
                <a href="https://github.com/gadicc/stable-diffusion-react-nextjs-mui-pwa">
                  GitHub project page
                </a>{" "}
                and let&apos;s build something awesome together.
              </Trans>
            </p>

            <p>
              <Trans>
                <b>KIRI</b> (&quot;霧&quot;) is the Japanese word for
                &quot;fog&quot;, a natural phenomena sharing the same
                &quot;spreading&quot; (<b>diffusion</b>) quality as the method
                we use for image generation. It has a sharp sound, just like the
                sharp images we hope you&apos;ll produce here :) You could thus
                consider the site to also be called &quot;fog art&quot; or
                &quot;diffusion art&quot;.
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

          <Typography variant="h6" component="h1" gutterBottom>
            <Trans>Acknowledements and Thanks</Trans>
          </Typography>

          <p>
            <Trans>
              We cannot overstate our thanks, appreciation and gratitude towards
              the following researchers, organizations and companies for their
              role in helping to <b>democratize AI</b>.
            </Trans>
          </p>

          <Box>
            <ul>
              <li>
                <Trans>
                  <a href="https://stability.ai">Stability.Ai</a> - for their
                  incredible time, work and efforts in creating{" "}
                  <b>StableDiffusion</b> and no less so, their decision to
                  release it publicly with an open source license.
                </Trans>
              </li>
              <br />
              <li>
                <Trans>
                  <a href="https://huggingface.co/">HuggingFace</a> - for their
                  passion and inspiration for making machine learning more
                  accessibe to developers, and in particular, their{" "}
                  <a href="https://github.com/huggingface/diffusers">
                    Diffusers
                  </a>{" "}
                  Library.
                </Trans>
              </li>
              <br />
              <li>
                <Trans>
                  <a href="https://twitter.com/Comamoca_">@Comamoca_</a>{" "}
                  (こまもか🦊) who contributed the name &quot;KIRI&quot;
                  (&quot;霧&quot;) and has just generally been super helpful and
                  supportive of the project 🙏.
                </Trans>
              </li>
            </ul>
          </Box>

          <Copyright />
        </Box>
      </Container>
    </>
  );
};

export default About;
