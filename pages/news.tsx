import React from "react";
import { t } from "@lingui/macro";

import AppBar from "../src/MyAppBar";

import { Container, Box, Typography } from "@mui/material";
import Link from "next/link";

export default function News() {
  return (
    <Box>
      <AppBar title={t`News`} />
      <Container maxWidth="sm" sx={{ my: 2 }}>
        <Typography variant="h6">What&apos;s Next?</Typography>

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
            <b>Sat Dec 24, 2022</b>
            <ul style={{ marginTop: "10px" }}>
              <li>
                <b>Speed & Stability</b>: Thanks everyone for your patience.
                We&apos;ve added an additional provider that seems faster and
                more reliable. We&apos;re still working on this so in the
                meantime, generations will go for 0.25 credits each.
              </li>
              <br />

              <li>
                <b>Long Prompts + Weights</b>: We noticed in Stars that some of
                you were (trying to) use prompt weights e.g. &quot;girl with
                ((big eyes))&quot;. We&apos;ve added support for this format now
                too, enjoy! More info{" "}
                <a href="https://forums.kiri.art/t/lpw-stable-diffusion-pipeline-longer-prompts-prompt-weights/82">
                  here
                </a>
                .
              </li>
              <br />

              <li>
                <b>Misc fixes and improvements</b> over the last month: No more
                lag in the front page Starred view. No more
                &quot;Forbidden&quot; error when (sometimes) first loading the
                app. Stable Diffusion v2.0 and v2.1 models. Super fast DPM
                sampler (same quality in 20 steps), Eular schedulers. Better app
                update detection. Volume discounts when buying credits. Firefox
                drawing fix.
              </li>
              <br />

              <li>
                <b>Container improvements</b>. I know the site front-end
                isn&apos;t updated that often, but for lack of doubt, the
                container that handles the image generation sees hours of daily
                work, with more fun things coming soon. Thanks for your loyal
                support!
              </li>
            </ul>
          </li>
          <br />

          <li>
            <b>Mon Oct 31, 2022</b>
            <ul style={{ marginTop: "10px" }}>
              <li>
                <b>Intermittant issues</b> due to unusually high demand.
                We&apos;ve upgraded to a bigger database plan and apologise for
                any inconvience caused over the approx. 1hr period.
              </li>
            </ul>
          </li>
          <br />

          <li>
            <b>Thu Oct 27, 2022</b>
            <ul style={{ marginTop: "10px" }}>
              <li>
                <b>Ability to report / flag harmful images.</b> If the same
                image is reported 3 times it will be removed.
              </li>
              <li>
                <b>Edit / remix button for Stars:</b> click to load a starred
                image back into the generation pages with all the original
                inputs.
              </li>
              <li>
                <b>User profile improvements:</b> more prominent usernames,
                share button for profiles and starred items.
              </li>
            </ul>
          </li>
        </ul>

        <ul>
          <li>
            <b>Fri Oct 21, 2022</b>
            <ul style={{ marginTop: "10px" }}>
              <li>
                <b>Stable Diffusion 1.5</b>
              </li>
              <li>
                SD <b>fine-tuned inpainting</b> model (note: doesn&apos;t work
                on all image sizes yet)
              </li>
              <li>Diffusers v0.7.0.dev0</li>
              <li>
                Enabled <b>pinch-to-zoom</b> site-wide
              </li>
              <li>
                Enabled <b>landscape orientation</b> (you made need to
                re-install the PWA)
              </li>
            </ul>
          </li>
          <br />

          <li>
            <b>Tue Oct 11, 2022</b>
            <ul style={{ marginTop: "10px" }}>
              <li>
                <Link href="/history">History</Link> page and functionality.
              </li>
            </ul>
          </li>
          <br />

          <li>
            <b>Fri Oct 07, 2022</b>
            <ul style={{ marginTop: "10px" }}>
              <li>
                Upgrade to <b>Diffusers 0.4.1</b>.
              </li>
              <li>
                Add support for <b>negative prompts</b>.
              </li>
              <li>
                Workaround diffusers bug in <b>img2img, inpainting</b> (which
                weren&apos;t working for a few hours until we noticed).
              </li>
              <li>
                <b>Waifu Diffusion 1.3 final</b> available as fp16 and full
                precision.
              </li>
            </ul>
          </li>
          <br />

          <li>
            <b>Thu Oct 06, 2022</b>
            <ul style={{ marginTop: "10px" }}>
              <li>
                SD-MUI is now <b>KIRI.ART</b>. New name, new domain, see the{" "}
                <Link href="/about">about</Link> page for more details. If you
                previously installed the app, you may need to install it again.
              </li>
              <br />
              <li>
                Waifu Diffusion v1.3 final release landed today and is live for
                your diffusion pleasure.
              </li>
            </ul>
          </li>
          <br />

          <li>
            <b>Tue Oct 04, 2022</b>
            <ul style={{ marginTop: "10px" }}>
              <li>
                <b>Output Image tools</b> (tap the image to activate) now
                include a <b>&quot;magic wand&quot;</b> icon to re-use the image
                in Upsampling / Inpainting views.
              </li>
              <br />
              <li>
                <b>Faster generation times!</b> Requests should now complete
                within 20s for a 512x512 x50step image, or within 5s a previous
                request was made (by you or another user) in the 10s before.{" "}
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
