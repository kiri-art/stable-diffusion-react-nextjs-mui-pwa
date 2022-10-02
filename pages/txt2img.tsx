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
import Controls, { randomizeSeedIfChecked } from "../src/sd/Controls";
import useRandomPrompt from "../src/sd/useRandomPrompt";
import Footer from "../src/sd/Footer";
import sharedInputTextFromInputs from "../src/lib/sharedInputTextFromInputs";

const txt2imgState = [
  "prompt",
  "MODEL_ID",
  "num_inference_steps",
  "guidance_scale",
  "width",
  "height",
  "seed",
  "randomizeSeed",
  "shareInputs",
  "safety_checker",
  "sampler",
];

export default function Txt2Img() {
  const [imgSrc, setImgSrc] = React.useState<string>("");
  const [nsfw, setNsfw] = React.useState(false);
  const [log, setLog] = React.useState([] as Array<string>);
  const [dest, setDest] = React.useState(
    isDev ? "banana-local" : "banana-remote"
  );
  const [requestStartTime, setRequestStartTime] = React.useState<number | null>(
    null
  );
  const [requestEndTime, setRequestEndTime] = React.useState<number | null>(
    null
  );

  const userId = useGongoUserId();
  const user = useGongoOne((db) =>
    db.collection("users").find({ _id: userId })
  );
  const router = useRouter();

  // TODO, move stuff to here
  const uiState = { dest: { value: dest, set: setDest } };

  const inputs = useModelState(txt2imgState);
  const sharedInputs = sharedInputTextFromInputs(inputs);
  // console.log(inputs);
  const randomPrompt = useRandomPrompt(inputs.MODEL_ID.value);

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

    setRequestStartTime(Date.now());
    setRequestEndTime(null);

    const modelInputs = modelStateValues(inputs);
    const seed = randomizeSeedIfChecked(inputs);

    const PIPELINE = "StableDiffusionPipeline";
    const SCHEDULER = modelInputs.sampler; // "LMS";
    /*
    if (modelInputs.MODEL_ID === "hakurei/waifu-diffusion") {
      SCHEDULER = "DDIM";
    }
    */

    await txt2img(
      {
        ...modelInputs,
        prompt: inputs.prompt.value || randomPrompt,
        seed,
      },
      {
        PIPELINE,
        SCHEDULER,
      },
      {
        setLog,
        setImgSrc,
        setNsfw,
        dest,
        // @ts-expect-error: TODO, db auth type
        auth: db.auth.authInfoToSend(),
        MODEL_NAME: "TXT2IMG",
      }
    );

    setRequestEndTime(Date.now());
  }

  return (
    <>
      <MyAppBar title={t`Text to Image`} />
      <Container maxWidth="lg">
        <OutputImage
          text={sharedInputs}
          imgSrc={imgSrc}
          nsfw={nsfw}
          log={log}
          requestStartTime={requestStartTime}
          requestEndTime={requestEndTime}
        />
        <Controls
          go={go}
          inputs={inputs}
          randomPrompt={randomPrompt}
          uiState={uiState}
          requestStartTime={requestStartTime}
          requestEndTime={requestEndTime}
        />
        <Footer />
      </Container>
    </>
  );
}
