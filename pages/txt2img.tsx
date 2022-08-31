import React from "react";
import {
  Box,
  Button,
  Container,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";

import MyAppBar from "../src/MyAppBar";
import txt2img from "../src/adapters/txt2img";

const isDev =
  process.env.NODE_ENV === "development" ||
  (typeof location === "object" && !!location.href.match(/localhost/));

function Log({ log }: { log: string[] }) {
  const ref = React.useRef<HTMLPreElement>(null);

  React.useEffect(() => {
    if (ref.current) ref.current.scrollIntoView(false);
  });

  return log.length ? <pre ref={ref}>{log.join("\n")}</pre> : null;
}

export default function Txt2Img() {
  const [prompt, setPrompt] = React.useState("");
  const [log, setLog] = React.useState([] as Array<string>);
  const imgResult = React.useRef<HTMLImageElement>();
  const [dest, setDest] = React.useState(isDev ? "exec" : "http");

  async function go() {
    setLog(["[WebUI] Executing..."]);
    const img = await txt2img({ prompt }, { setLog, imgResult });
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
              border: "1px solid #ddd",
            }}
          >
            <img
              ref={imgResult}
              width="512"
              height="512"
              style={{ position: "absolute", left: 0, top: 0 }}
              display={log.length ? "none" : "block"}
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
        {isDev ? (
          <Grid container sx={{ my: 1 }}>
            <Grid item xs={9} sm={9} md={9}>
              <Button variant="contained" fullWidth sx={{ my: 1 }} onClick={go}>
                Go
              </Button>
            </Grid>
            <Grid item xs={3} sm={3} md={3} sx={{ pl: 1, pt: 1 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="dest-select-label">Dest</InputLabel>
                <Select
                  labelId="dest-select-label"
                  id="dest-select"
                  value={dest}
                  label="Dest"
                  onChange={(e) => setDest(e.target.value as string)}
                >
                  <MenuItem value="exec">local (exec)</MenuItem>
                  <MenuItem value="http">remote (http)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        ) : (
          <Button variant="contained" fullWidth sx={{ my: 1 }} onClick={go}>
            Go
          </Button>
        )}
      </Container>
    </>
  );
}
