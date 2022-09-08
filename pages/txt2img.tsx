import { t } from "@lingui/macro";
import { db, useGongoUserId, useGongoOne } from "gongo-client-react";
import { useRouter } from "next/router";

import { isDev, REQUIRE_REGISTRATION } from "../src/lib/client-env";
import useModelState, { modelStateValues } from "../src/sd/useModelState";

import { Container } from "@mui/material";

import MyAppBar from "../src/MyAppBar";
import React from "react";
import txt2img from "../src/adapters/txt2img";
import OutputImage from "../src/OutputImage";
import Controls from "../src/sd/Controls";
import useRandomPrompt from "../src/sd/useRandomPrompt";
import Footer from "../src/sd/Footer";

const txt2imgState = [
  "prompt",
  "num_inference_steps",
  "guidance_scale",
  "width",
  "height",
];

export default function Txt2Img() {
  const [imgSrc, setImgSrc] = React.useState<string>("");
  const [log, setLog] = React.useState([] as Array<string>);
  const [dest, setDest] = React.useState(
    isDev ? "banana-local" : "banana-remote"
  );
  const randomPrompt = useRandomPrompt();

  const userId = useGongoUserId();
  const user = useGongoOne((db) =>
    db.collection("users").find({ _id: userId })
  );
  const router = useRouter();

  // TODO, move stuff to here
  const uiState = { dest: { value: dest, set: setDest } };

  const inputs = useModelState(txt2imgState);
  console.log(inputs);

  async function go(event: React.SyntheticEvent) {
    event.preventDefault();

    if (REQUIRE_REGISTRATION) {
      // TODO, record state in URL, e.g. #prompt=,etc
      if (!user) return router.push("/login?from=/txt2img");
      if (!(user.credits.free > 0 || user.credits.paid > 0))
        return router.push("/credits");
    }

    // setLog(["[WebUI] Executing..."]);
    setImgSrc("/img/placeholder.png");
    if (!inputs.prompt.value) inputs.prompt.setValue(randomPrompt);

    await txt2img(
      {
        ...modelStateValues(inputs),
        prompt: inputs.prompt.value || randomPrompt,
      },
      // @ts-expect-error: TODO, db auth type
      { setLog, setImgSrc, dest, auth: db.auth.authInfoToSend() }
    );
  }

  return (
    <>
      <MyAppBar title={t`Text to Image`} />
      <Container maxWidth="lg">
        <OutputImage
          prompt={inputs.prompt.value.toString()}
          imgSrc={imgSrc}
          log={log}
        />
        <Controls
          go={go}
          inputs={inputs}
          randomPrompt={randomPrompt}
          uiState={uiState}
        />
        <Footer />
      </Container>
    </>
  );
}
