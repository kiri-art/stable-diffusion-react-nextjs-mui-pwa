import React from "react";
import { useRouter } from "next/router";

import MyAppBar from "../src/MyAppBar";
import { Container, Typography, Box } from "@mui/material";
import { Trans } from "@lingui/macro";

export default function FAQ() {
  useRouter();

  const sections = [
    {
      title: "General",
      qa: [
        [
          "Where does the money go?",
          "Currently, everything is going towards covering running costs.  If this ever turns a profit, it will fund continued development, plus I also have some ideas for compensation to model authors in the future.",
        ],
        [
          "What are some good resources to get started?",
          <ol key="resources">
            <li>
              <p>
                <a href="https://github.com/awesome-stable-diffusion/awesome-stable-diffusion">
                  Awesome Stable-Diffusion
                </a>
                <br />A curated list of SD resources, guides, tips and software.
              </p>
            </li>

            <li>
              <p>
                <a href="https://www.reddit.com/r/StableDiffusion/">
                  r/StableDiffusion (reddit)
                </a>
                <br />
                Guides, image shares, experiments, finds, community.
              </p>
            </li>

            <li>
              <p>
                <a href="https://github.com/Maks-s/sd-akashic">
                  SD Akashic Guide
                </a>
                <br />
                SD studies, art styles, prompts.
              </p>
            </li>

            <li>
              <p>
                <a href="https://lexica.art">Lexica.art</a>
                <br />
                Search 5M+ SD prompts &amp; images.
              </p>
            </li>

            <li>
              <p>
                <i>
                  Suggest more resources in a{" "}
                  <a href="https://github.com/gadicc/stable-diffusion-react-nextjs-mui-pwa/issues">
                    GitHub Issue
                  </a>
                  .
                </i>
              </p>
            </li>
          </ol>,
        ],
      ],
    },
  ];

  return (
    <>
      <MyAppBar title="FAQ" />
      <Container sx={{ mt: 2 }}>
        <Typography variant="h4">
          <Trans>Frequently Asked Questions (FAQ)</Trans>
        </Typography>

        <ol>
          {sections.map(({ title }) => (
            <li key={title}>
              <a href={`#${title}`}>{title}</a>
            </li>
          ))}
        </ol>

        {sections.map(({ title, qa }) => (
          <Box key={title} sx={{ mt: 2 }}>
            <a id={title} />
            <Typography variant="h5">{title}</Typography>
            <ol>
              {qa.map(([question, answer]) => (
                <li key={question as string} style={{ marginBottom: "2em" }}>
                  <div style={{ fontWeight: "bold", marginBottom: "1em" }}>
                    {question}
                  </div>
                  <div>{answer}</div>
                </li>
              ))}
            </ol>
          </Box>
        ))}
      </Container>
    </>
  );
}
