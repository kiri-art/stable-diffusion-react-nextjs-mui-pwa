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

        <p>
          <i>
            For the full list of updates, see our{" "}
            <a href="https://github.com/gadicc/stable-diffusion-react-nextjs-mui-pwa/commits/dev">
              commit history
            </a>{" "}
            on GitHub.
          </i>
        </p>

        <ul>
          <li>
            <b>Tue Oct 04, 2022</b>
            <ul style={{ marginTop: "10px" }}>
              <li>
                Output Image tools now include a &quot;magic wand&quot; icon
                that re-opens image in Upsampling / Inpainting views.
              </li>
            </ul>
          </li>
          <br />

          <li>
            <b>Sun Oct 01, 2022</b>
            <ul style={{ marginTop: "10px" }}>
              <li>
                New Waifu Diffusion 1.3, daily updates until full release.
              </li>
            </ul>
          </li>
          <br />

          <li>
            <b>Thu Sep 30, 2022</b>
            <ul style={{ marginTop: "10px" }}>
              <li>Daily 20 credit topup until further notice! 🎉</li>
            </ul>
          </li>
          <br />

          <li>
            <b>Mon Sep 26, 2022</b>
            <ul style={{ marginTop: "10px" }}>
              <li>
                <b>Fixed slowness, 50 credit top up.</b> Our upstream provider
                had some intermittent issues but we are back up to full speed!
                As an apology, and our thanks for your early support, we&apos;ve
                topped everyone back up to 50 credits.
              </li>
            </ul>
          </li>
          <br />

          <li>
            <b>Fri Sep 23, 2022</b>
            <ul style={{ marginTop: "10px" }}>
              <li>
                <b>
                  Img2img / inpaint fix for uploaded images with unfortunate
                  dimensions.
                </b>{" "}
                We now detect this case and scale the image appropriately (more
                options to come in the future).
              </li>
            </ul>
          </li>
          <br />

          <li>
            <b>Sun Sep 18, 2022</b>
            <ul style={{ marginTop: "10px" }}>
              <li>
                <b>Breakages and slowness</b> due to upstream provider issues,
                we apologize! Things are back up and running again and all
                recent users were awarded 30 free credits for the inconvenience.
              </li>
            </ul>
          </li>
          <br />

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
