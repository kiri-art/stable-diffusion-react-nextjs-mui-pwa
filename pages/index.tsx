import * as React from "react";
import type { NextPage } from "next";
import { t, Trans } from "@lingui/macro";

import {
  Box,
  Button,
  Container,
  Unstable_Grid2 as Grid,
  Typography,
} from "@mui/material";

import Link from "../src/Link";
import MyAppBar from "../src/MyAppBar";
import Copyright from "../src/Copyright";
import Image from "next/image";
import { useRouter } from "next/router";

const Home: NextPage = () => {
  const router = useRouter();

  const itemData = [
    {
      title: t`Text to Image`,
      href: "/txt2img",
      img: "/img/pages/txt2img.png",
      alt: "txt2img example",
    },
    {
      title: t`Image to Image`,
      href: "/img2img",
      img: "/img/pages/img2img.png",
      alt: "img2img example",
    },
    {
      title: t`Inpainting`,
      href: "/inpaint",
      img: "/img/pages/inpaint.png",
      alt: "inpaint example",
    },
    {
      title: t`Upsampling`,
      href: "/upsample",
      img: "/img/pages/upsample.png",
      alt: "upsample example",
    },
  ];

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
          <Grid container spacing={2} width="100%">
            {itemData.map((item) => (
              <Grid key={item.href} xs={6} sm={4} md={3} lg={3} xl={3}>
                <Box
                  sx={{
                    p: 0,
                    m: 0,
                    background: "#eee",
                    border: "1px solid #aaa",
                    borderRadius: "12px",
                    cursor: "pointer",
                    textAlign: "center",
                  }}
                  onClick={() => router.push(item.href)}
                >
                  <Image
                    layout="responsive"
                    width={150}
                    height={150}
                    src={item.img}
                    alt={item.title}
                  />
                </Box>

                <Button
                  fullWidth
                  component={Link}
                  href={item.href}
                  variant="contained"
                  sx={{ my: 1 }}
                >
                  {item.title}
                </Button>
              </Grid>
            ))}
          </Grid>
        </Box>
        <Box sx={{ my: 1 }}>
          <p style={{ textAlign: "center", fontWeight: "bold" }}>
            <Trans>Be Responsible</Trans>
          </p>
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
        <Box sx={{ my: 1 }}>
          <p style={{ textAlign: "center", fontWeight: "bold" }}>
            <Trans>Project Goals</Trans>
          </p>
          <ol>
            <li>
              <b>
                <Trans>Super simple, easy to share.</Trans>
              </b>{" "}
              <Trans>
                Zero setup, mobile-first. Easy for anyone - no matter their tech
                experience - to have access to this technology, and be able to
                play around and get excited about it.
              </Trans>
            </li>
            <br />
            <li>
              <b>
                <Trans>Open Source, developer friendly.</Trans>
              </b>{" "}
              <Trans>
                Transparent development and easy for developers to get involved.
                Especially web devs without any prior background in Machine
                Learning.
              </Trans>
            </li>
          </ol>
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
          <Trans>Read the full Terms of Service below.</Trans>
        </Box>
        <Copyright />
      </Container>
    </>
  );
};

export default Home;
