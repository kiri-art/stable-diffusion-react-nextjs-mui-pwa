import React from "react";
import { t } from "@lingui/macro";

import AppBar from "../src/MyAppBar";

import { Container, Box, Typography } from "@mui/material";

export default function News() {
  return (
    <Box>
      <AppBar title={t`News`} />
      <Container maxWidth="sm">
        <Box
          sx={{ my: 2, p: 1, border: "1px solid #bbb", textAlign: "justify" }}
        >
          Thanks to all our early supporters! You may have noticed that
          we&apos;ve been topping up your credits if you&apos;ve been running
          low. You&apos;ll also soon be topped up to 100 credits. Just our way
          of saying thanks for your support and patience as we get started!
        </Box>

        <Typography variant="h6">What&apos;s Next?</Typography>

        <ul>
          <li>Better updates while waiting</li>
          <li>Faster inferences (generation time)</li>
        </ul>

        <p>
          Problems? Suggestions? See our{" "}
          <a href="https://github.com/gadicc/stable-diffusion-react-nextjs-mui-pwa/issues">
            GitHub issues
          </a>{" "}
          page.
        </p>

        <Typography variant="h6">Updates</Typography>

        <ul>
          <li>
            <b>Sat Sep 17, 2022</b>
            <ul style={{ marginTop: "10px" }}>
              <li>Fixed error on requests longer than 60s</li>
            </ul>
          </li>
          <br />

          <li>
            <b>Fri Sep 16, 2022</b>
            <ul style={{ marginTop: "10px" }}>
              <li>
                Extra models:{" "}
                <a href="https://huggingface.co/hakurei/waifu-diffusion">
                  Waifu
                </a>{" "}
                and{" "}
                <a href="https://github.com/rinnakk/japanese-stable-diffusion">
                  JapaneseStableDiffusion
                </a>{" "}
                (selectable below the &quot;Go&quot; button).
              </li>
            </ul>
          </li>
        </ul>
      </Container>
    </Box>
  );
}
