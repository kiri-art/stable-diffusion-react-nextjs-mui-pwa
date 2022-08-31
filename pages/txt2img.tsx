import React from "react";
import { Box, Button, Container, TextField } from "@mui/material";

import MyAppBar from "../src/MyAppBar";
import txt2img from "../src/adapters/txt2img";

function Log({ log }: { log: string[] }) {
  const ref = React.useRef<HTMLPreElement>(null);

  React.useEffect(() => {
    if (ref.current) ref.current.scrollIntoView(false);
  });

  return <pre ref={ref}>hello {log.join("\n")}</pre>;
}

export default function Txt2Img() {
  const [prompt, setPrompt] = React.useState("");
  const [log, setLog] = React.useState([]);
  const imgResult = React.useRef();

  async function go() {
    const img = await txt2img({ prompt }, { setLog });
    console.log(img);
  }

  return (
    <>
      <MyAppBar title="txt2img" />
      <Container maxWidth="lg">
        <Box
          sx={{
            my: 1,
            width: "100%",
            height: 517,
          }}
        >
          <Box
            sx={{
              width: 512,
              height: 512,
              position: "relative",
              margin: "auto",
            }}
          >
            <img
              ref={imgResult}
              width="512"
              height="512"
              style={{ position: "absolute", left: 0, top: 0 }}
            ></img>
            <Box
              sx={{
                py: 0.5,
                px: 2,
                width: 512,
                height: 512,
                position: "absolute",
                left: 0,
                top: 0,
                overflow: "auto",
              }}
            >
              <Log log={log} />
            </Box>
          </Box>
        </Box>
        <TextField
          label="Prompt"
          fullWidth
          multiline
          value={prompt}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setPrompt(event.target.value);
          }}
        />
        <Button variant="contained" fullWidth sx={{ my: 1 }} onClick={go}>
          Go
        </Button>
      </Container>
    </>
  );
}
