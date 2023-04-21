import { t } from "@lingui/macro";
import { useGongoUserId, useGongoOne } from "gongo-client-react";
import { useRouter } from "next/router";

import { isDev, REQUIRE_REGISTRATION } from "../src/lib/client-env";
import useModelState, { modelStateValues } from "../src/sd/useModelState";

import { Container } from "@mui/material";

import MyAppBar from "../src/MyAppBar";
import React from "react";
import OutputImage from "../src/OutputImage";
import Controls, { randomizeSeedIfChecked } from "../src/sd/Controls";
import useRandomPrompt from "../src/sd/useRandomPrompt";
import Footer from "../src/sd/Footer";
import sharedInputTextFromInputs from "../src/lib/sharedInputTextFromInputs";
import { outputImageQueue } from "../src/lib/sendQueue";
import fetchToOutput from "../src/lib/fetchToOutput";

const txt2imgState = [
  "prompt",
  "MODEL_ID",
  "PROVIDER_ID",
  "negative_prompt",
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
  const [historyId, setHistoryId] = React.useState("");

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

    await fetchToOutput(
      "dda",
      {
        ...modelInputs,
        prompt: inputs.prompt.value || randomPrompt,
        seed,
      },
      {
        PIPELINE: "lpw_stable_diffusion",
        custom_pipeline_method: "text2img",
        SCHEDULER: modelInputs.sampler,
      },
      {
        setLog,
        setImgSrc,
        setNsfw,
        setHistoryId,
      }
    );

    setRequestEndTime(Date.now());
  }

  React.useEffect(() => {
    if (outputImageQueue.has()) {
      const share = outputImageQueue.get();
      console.log(share);
      if (!share) return;

      // share.files[0]
      const reader = new FileReader();
      reader.onload = () =>
        reader.result && setImgSrc(reader.result.toString());
      reader.readAsDataURL(share.files[0]);
    }
  }, []);

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
          historyId={historyId}
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
