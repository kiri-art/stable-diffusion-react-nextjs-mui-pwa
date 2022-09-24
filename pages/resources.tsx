import React from "react";
import { t } from "@lingui/macro";

import AppBar from "../src/MyAppBar";

import { Container, Box } from "@mui/material";

export default function Resources() {
  return (
    <Box>
      <AppBar title={t`Resources`} />
      <Container maxWidth="sm" style={{ textAlign: "center" }}>
        <p>
          <a href="https://github.com/awesome-stable-diffusion/awesome-stable-diffusion">
            Awesome Stable-Diffusion
          </a>
          <br />A curated list of SD resources, guides, tips and software.
        </p>

        <p>
          <a href="https://www.reddit.com/r/StableDiffusion/">
            r/StableDiffusion (reddit)
          </a>
          <br />
          Guides, image shares, experiments, finds, community.
        </p>

        <p>
          <a href="https://github.com/Maks-s/sd-akashic">SD Akashic Guide</a>
          <br />
          SD studies, art styles, prompts.
        </p>
        <p>
          <a href="https://lexica.art">Lexica.art</a>
          <br />
          Search 5M+ SD prompts &amp; images.
        </p>

        <p>
          <i>
            Suggest more resources in a{" "}
            <a href="https://github.com/gadicc/stable-diffusion-react-nextjs-mui-pwa/issues">
              GitHub Issue
            </a>
            .
          </i>
        </p>
      </Container>
    </Box>
  );
}
