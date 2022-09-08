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
            my: 2,
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
            <Trans>Text to Image</Trans>
          </Button>
          <Button
            component={Link}
            href="/img2img"
            variant="contained"
            sx={{ my: 1 }}
          >
            <Trans>Image to Image</Trans>
          </Button>
          <Button
            component={Link}
            href="/inpaint"
            variant="contained"
            sx={{ my: 1 }}
          >
            <Trans>Inpainting</Trans>
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
        <Box sx={{ my: 1 }}>
          <b>
            <Trans>Be Responsible</Trans>
          </b>
          <ul>
            <li>
              <Trans>
                Do not create any harmful content (racist, inciteful, etc).
              </Trans>
            </li>
            <li>
              <Trans>
                No deepfakes aside for fair use (e.g. humour, education, nothing
                misleading or political).
              </Trans>
            </li>
            <li>
              <Trans>
                You must make clear on any content you share elsewhere that the
                image is computer generated.
              </Trans>
            </li>
          </ul>
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
        </Box>{" "}
        <Box sx={{ fontSize: "80%", mb: 2 }}>
          <b>
            <Trans>Terms of Service</Trans>
          </b>
          :{" "}
          <Trans>
            1) Use at your own risk, we assume no responsibilty for any
            consequences as a result of your use (or misuse) of this project. 2)
            Any use of this site or project implies acceptance of its terms, and
            rules, including the &quot;be responsible&quot; rules above, Stable
            Diffusion&apos;s{" "}
            <a href="https://huggingface.co/spaces/CompVis/stable-diffusion-license">
              CreativeML Open RAIL-M license
            </a>
            , and this project&apos;s{" "}
            <a href="https://github.com/gadicc/stable-diffusion-react-nextjs-mui-pwa/blob/main/LICENSE.txt">
              MIT license
            </a>
            .
          </Trans>
        </Box>
        <Copyright />
      </Container>
    </>
  );
};

export default Home;
