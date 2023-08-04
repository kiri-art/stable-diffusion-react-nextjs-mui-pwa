import React from "react";
import { useGongoUserId, useGongoOne } from "gongo-client-react";
import { useRouter } from "next/router";
import { toast } from "react-toastify";
import { Trans } from "@lingui/macro";
import NextImage from "next/image";

import { Container, Grid } from "@mui/material";

import { isDev, REQUIRE_REGISTRATION } from "../src/lib/client-env";
import useModelState, { modelStateValues } from "../src/sd/useModelState";
import OutputImage from "../src/OutputImage";
import Controls, { randomizeSeedIfChecked } from "../src/sd/Controls";
import Footer from "../src/sd/Footer";
import sharedInputTextFromInputs from "./lib/sharedInputTextFromInputs";
import blobToBase64 from "./lib/blobToBase64";
import sendQueue, { outputImageQueue } from "./lib/sendQueue";
import fetchToOutput from "./lib/fetchToOutput";

function Canvas({
  initImageCanvasRef,
}: {
  // file: File | null;
  initImageCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
}) {
  return (
    <div
      style={{
        maxWidth: 512,
        // maxHeight: 512,
        marginLeft: "auto",
        marginRight: "auto",
      }}
    >
      <canvas
        id="initImageCanvas"
        style={{
          // position: "absolute",
          // top: 0,
          // left: 0,
          // disable scroll if we're drawing (i.e. no file)
          // touchAction: "none", // file ? undefined : "none",
          // border: DRAW_BORDERS ? "1px solid red" : undefined,
          // Canvas is cropped image size, browser will scale to fill window
          width: "100%",
          maxWidth: 512,
          // maxHeight: 512,
          aspectRatio: "1",
          border: "1px solid black",
          marginLeft: "auto",
          marginRight: "auto",
        }}
        ref={initImageCanvasRef}
      />
    </div>
  );
}

const ipix2pixState = [
  "prompt",
  { id: "MODEL_ID", hidden: true, default: "timbrooks/instruct-pix2pix" },
  "PROVIDER_ID",
  "negative_prompt",
  "num_inference_steps",
  "guidance_scale",
  "image_guidance_scale",
  "seed",
  "randomizeSeed",
  "shareInputs",
  "safety_checker",
  "sampler",
];

const exampleImages = [
  "Swap sunflower with roses",
  "Add fireworks to the sky",
  "Replace the fruits with cake",
  "What would it look like if it were snowing?",
  "Turn it into a still from a western",
  "Make his jacket out of leather",
];

function WhatIsThis() {
  return (
    <Container sx={{ pb: 1 }}>
      <details style={{ fontSize: "80%" }}>
        <summary style={{ textAlign: "center", marginBottom: "15px" }}>
          <Trans>What is this?</Trans> & <Trans>Important Tips</Trans>
        </summary>
        <Trans>
          Instruct-Pix2Pix is a Stable Diffusion model fine-tuned for editing
          images from human instructions. Given an input image and a written
          instruction that tells the model what to do, the model follows these
          instructions to edit the image.
        </Trans>
        <br />
        <br />
        <Grid container spacing={1}>
          {exampleImages.map((alt, i) => (
            <Grid item xs={6} sm={4} md={3} lg={2} key={i}>
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "1.32",
                }}
              >
                <NextImage
                  src={`/img/ipix2pix/${i + 1}.jpg`}
                  alt={alt}
                  fill
                  style={{ objectFit: "contain" }}
                />
              </div>
            </Grid>
          ))}
        </Grid>
        <br />
        Notes:
        <ol>
          <style jsx>{`
            li {
              margin-bottom: 10px;
            }
            li li {
              margin-top: 10px;
            }
          `}</style>
          <li>Images are scaled down to max 1024x1024.</li>
          <li>Randomness plays a big part, its worth trying a few times.</li>
          <li>
            <b>Is the image not changing enough?</b> Your Image CFG weight may
            be too high. This value dictates how similar the output should be to
            the input. It&apos;s possible your edit requires larger changes from
            the original image, and your Image CFG weight isn&apos;t allowing
            that. Alternatively, your Text CFG weight may be too low. This value
            dictates how much to listen to the text instruction. The default
            Image CFG of 1.5 and Text CFG of 7.5 are a good starting point, but
            aren&apos;t necessarily optimal for each edit. Try:
            <ul>
              <li>Decreasing the Image CFG weight, or</li>
              <li>Increasing the Text CFG weight, or</li>
            </ul>
          </li>
          <li>
            Conversely, <b>is the image changing too much</b>, such that the
            details in the original image aren&apos;t preserved? Try:
          </li>
          <ul>
            <li>Increasing the Image CFG weight, or</li>
            <li>Decreasing the Text CFG weight</li>
          </ul>
          <li>
            When adjusting the CFG scales, consider *unchecking* the Randomize
            option (so that the only changes are to the scale, and not
            additional random ones){" "}
          </li>
          <li>
            Rephrasing the instruction sometimes improves results (e.g.,
            &quot;turn him into a dog&quot; vs. &quot;make him a dog&quot; vs.
            &quot;as a dog&quot;).
          </li>
          <li>Increasing the number of steps sometimes improves results.</li>
          <li>
            Do faces look weird? The Stable Diffusion autoencoder has a hard
            time with faces that are small in the image. Try cropping the image
            so the face takes up a larger portion of the frame.
          </li>
        </ol>
        <div>
          <a
            target="_blank"
            href="https://www.timothybrooks.com/instruct-pix2pix/"
          >
            InstructPix2Pix: Learning to Follow Image Editing Instructions
          </a>{" "}
          (
          <a target="_blank" href="https://arxiv.org/abs/2211.09800">
            Paper
          </a>
          ) by Tim Brooks*, Aleksander Holynski*, Alexei A. Efros (UC Berkeley).
          *denotes equal contribution
        </div>
      </details>
    </Container>
  );
}

export default function IPix2Pix() {
  const inputFile = React.useRef<HTMLInputElement>(null);
  const initImageCanvasRef = React.useRef<HTMLCanvasElement>(null);
  const imageRef = React.useRef<HTMLImageElement | null>(null);
  // const [initImageLoaded, setInImgLoaded] = React.useState(false);
  // const [file, setFile] = React.useState<File | null>(null);
  // const fileIsLoading = React.useRef(false);

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

  const uiState = { dest: { value: dest, set: setDest } };

  const inputs = useModelState(ipix2pixState);
  const sharedInputs = sharedInputTextFromInputs(inputs);

  function readFile(file: File) {
    const fileReader = new FileReader();
    // fileIsLoading.current = true;
    fileReader.onload = function (readerEvent) {
      //event.target.result
      // const result = event.target.result;
      //const result = fileReader.result;

      console.log("initImage loaded from disk");
      const image = (imageRef.current = new Image());
      image.onload = function (_imageEvent) {
        console.log("initImage loaded to image");
        const canvas = initImageCanvasRef.current;
        if (!canvas) throw new Error("no canvas");

        // Later we could get fancy and clip around just the mask at send time.
        let width, height;
        // const SD_MAX = [1024, 768]; // can also be 768x1024
        const SD_MAX = [1024, 1024];

        if (image.width >= image.height && image.width > SD_MAX[0]) {
          width = SD_MAX[0];
          height = Math.floor((image.height / image.width) * SD_MAX[0]);
          if (height > SD_MAX[1]) height = SD_MAX[1];
        } else if (image.height > image.width && image.height > SD_MAX[0]) {
          height = SD_MAX[0];
          width = Math.floor((image.width / image.height) * SD_MAX[0]);
          if (width > SD_MAX[1]) width = SD_MAX[1];
        } else {
          width = image.width;
          height = image.height;
        }

        console.log(`Original Image: ${image.width}x${image.height}`);
        console.log(`  Scaled Image: ${width}x${height}`);

        const aspectRatio = width / height;

        // Must be a multple of 64.  Scale for now, crop in future.
        if (width % 64 !== 0) {
          width = width - (width % 64);
          height = Math.floor(width / aspectRatio);
          if (height % 64 !== 0) height -= height % 64;
        } else if (height % 64 !== 0) {
          height = height - (height % 64);
          width = Math.floor(height * aspectRatio);
          if (width % 64 !== 0) width -= width % 64;
        }
        console.log(`   Fixed Image: ${width}x${height}`);

        //const parent = canvas.parentNode as HTMLDivElement;
        canvas.style.aspectRatio = aspectRatio.toString();

        canvas.width = width;
        canvas.height = height;
        canvas.style.display = "block";

        const ctx = canvas.getContext("2d" /*, { alpha: false } */);
        if (!ctx) throw new Error("no 2d contxt from canvas");

        ctx.drawImage(image, 0, 0, width, height);
        //setInImgLoaded(true);
        //setFile(file);
      };

      if (!readerEvent) throw new Error("no readerEevent");
      if (!readerEvent.target) throw new Error("no readerEevent.target");

      const result = readerEvent.target.result;
      const sample = "data:image/jpeg;base64,/9j/4Ty6RXhpZgA....FyyDbU//2Q==";
      if (typeof result !== "string")
        throw new Error(
          `readerEvent.target.result is not a string, expected "${sample}" but got: ` +
            JSON.stringify(result)
        );

      image.src = result;
      // fileIsLoading.current = false;
    };
    fileReader.readAsDataURL(file);
  }

  function fileChange(event: React.SyntheticEvent) {
    const target = event.target as HTMLInputElement;
    if (!(target instanceof HTMLInputElement))
      throw new Error("Event target is not an HTMLInputElement");

    // @ts-expect-error: I can't be any clearer, typescript
    const file = target.files[0];

    console.log(file);
    if (!file.type.match(/^image\//)) return toast("Not an image");

    setImgSrc("");

    readFile(file);
  }

  const userId = useGongoUserId();
  const user = useGongoOne((db) =>
    db.collection("users").find({ _id: userId })
  );
  const router = useRouter();

  async function go(event: React.SyntheticEvent) {
    event.preventDefault();

    if (REQUIRE_REGISTRATION) {
      // TODO, record state in URL, e.g. #prompt=,etc
      if (!user) return router.push("/login?from=/inpaint");
      if (!(user.credits.free > 0 || user.credits.paid > 0))
        return router.push("/credits");
    }

    // setLog(["[WebUI] Executing..."]);
    setImgSrc("/img/placeholder.png");

    if (!initImageCanvasRef.current)
      throw new Error("initImageCanvasRef.current not set");

    const init_image_blob = (await new Promise(
      (resolve) =>
        initImageCanvasRef.current &&
        initImageCanvasRef.current.toBlob(
          (blob: Blob | null) => resolve(blob),
          "image/jpeg"
        )
    )) as Blob | null;

    if (!init_image_blob) {
      console.log("no init image blob");
      return;
    }

    const modelInputs = {
      ...modelStateValues(inputs),
      // prompt: inputs.prompt.value || randomPrompt,
      image: await blobToBase64(init_image_blob),
      seed: randomizeSeedIfChecked(inputs),
    };

    const callInputs = {
      PIPELINE: "StableDiffusionInstructPix2PixPipeline",
      // @ts-expect-error: TODO
      SCHEDULER: modelInputs.sampler,
    };

    // return console.log(data);

    setRequestStartTime(Date.now());
    setRequestEndTime(null);

    await fetchToOutput("dda", modelInputs, callInputs, {
      setLog,
      setImgSrc,
      setNsfw,
      setHistoryId,
    });

    setRequestEndTime(Date.now());
  }

  React.useEffect(() => {
    if (sendQueue.has()) {
      const share = sendQueue.get();
      console.log(share);
      if (!share) return;
      readFile(share.files[0]);
    }
  }, []);

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
      <WhatIsThis />
      <Canvas initImageCanvasRef={initImageCanvasRef} />
      <div style={{ textAlign: "center" }}>
        <input type="file" ref={inputFile} onChange={fileChange}></input>
      </div>
      {imgSrc && (
        <OutputImage
          text={sharedInputs}
          imgSrc={imgSrc}
          nsfw={nsfw}
          log={log}
          requestStartTime={requestStartTime}
          requestEndTime={requestEndTime}
          historyId={historyId}
        />
      )}

      <Controls
        go={go}
        inputs={inputs}
        uiState={uiState}
        requestStartTime={requestStartTime}
        requestEndTime={requestEndTime}
      />
      <Footer />
    </>
  );
}
