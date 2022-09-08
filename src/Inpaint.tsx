import React from "react";
import { db, useGongoUserId, useGongoOne } from "gongo-client-react";
import { useRouter } from "next/router";

import { isDev, REQUIRE_REGISTRATION } from "../src/lib/client-env";
import useModelState, { modelStateValues } from "../src/sd/useModelState";
import txt2img from "../src/adapters/txt2img";
import OutputImage from "../src/OutputImage";
import Controls from "../src/sd/Controls";
import Footer from "../src/sd/Footer";

function MaskCanvas({
  canvasRef,
}: {
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
}) {
  const [drawing, setDrawing] = React.useState(false);
  // const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const ctxRef = React.useRef<CanvasRenderingContext2D | null>(null);
  const lastRef = React.useRef<{ x: number; y: number } | null>(null);

  function mouseDown(event: React.SyntheticEvent) {
    setDrawing(true);
  }
  function mouseUp(event: React.SyntheticEvent) {
    setDrawing(false);
    lastRef.current = null;
  }
  function mouseMove(event: React.SyntheticEvent) {
    event.preventDefault();
    const ctx = ctxRef.current;
    if (!drawing || !ctx) return;

    const { offsetX, offsetY } = event.nativeEvent;
    const last = lastRef.current;
    if (last) {
      ctx.beginPath();
      ctx.moveTo(last.x, last.y);
      ctx.lineTo(offsetX, offsetY);
      ctx.closePath();
      ctx.stroke();
    }
    lastRef.current = { x: offsetX, y: offsetY };
  }

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = (ctxRef.current = canvas && canvas.getContext("2d"));

    if (ctx) {
      ctx.lineWidth = 30;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.strokeStyle = "white";
    }
  }, []);

  return (
    <canvas
      style={{ position: "absolute", top: 0, left: 0, border: "1px solid red" }}
      ref={canvasRef}
      width={512}
      height={512}
      onMouseDown={mouseDown}
      onTouchStart={mouseDown}
      onMouseMove={mouseMove}
      onTouchMove={mouseMove}
      onMouseUp={mouseUp}
      onTouchEnd={mouseUp}
    ></canvas>
  );
}

const inpaintState = ["prompt", "num_inference_steps", "guidance_scale"];

async function blobToBase64(blob: Blob) {
  const data = await new Promise((resolve) => {
    const fileReader = new FileReader();
    fileReader.readAsDataURL(blob);
    fileReader.onloadend = function () {
      resolve(fileReader.result);
    };
  });

  // data:image/png;base64,....
  // @ts-expect-error: TODO
  return data.split(",")[1];
}

export default function Inpainting() {
  const inImgRef = React.useRef<HTMLImageElement>(null);
  const inputFile = React.useRef<HTMLInputElement>(null);
  const [inImgLoaded, setInImgLoaded] = React.useState(false);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const [imgSrc, setImgSrc] = React.useState<string>("");
  const [log, setLog] = React.useState([] as Array<string>);
  const [dest, setDest] = React.useState(
    isDev ? "banana-local" : "banana-remote"
  );

  const uiState = { dest: { value: dest, set: setDest } };

  const inputs = useModelState(inpaintState);
  console.log(inputs);

  function fileChange(event: React.SyntheticEvent) {
    const file = event.target.files[0];
    console.log(file);
    const fr = new FileReader();
    fr.onload = () => {
      console.log("onload");
      inImgRef.current.src = fr.result;
      console.log(fr.result);
      setInImgLoaded(true);
    };
    fr.readAsDataURL(file);
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

    const init_image_blob = await fetch(inImgRef.current.src).then((r) =>
      r.blob()
    );

    if (!init_image_blob) {
      console.log("no init image blob");
      return;
    }

    const mask_image_blob = (await new Promise((resolve) =>
      canvasRef.current.toBlob((blob: Blob | null) => resolve(blob))
    )) as Blob | null;

    if (!mask_image_blob) {
      console.log("no mask image");
      return;
    }

    console.log({
      ...modelStateValues(inputs),
      prompt: inputs.prompt.value,
      init_image: await blobToBase64(init_image_blob),
      mask_image: await blobToBase64(mask_image_blob),
      strength: 0.75,
    });

    // return;

    await txt2img(
      {
        ...modelStateValues(inputs),
        prompt: inputs.prompt.value,
        init_image: await blobToBase64(init_image_blob),
        mask_image: await blobToBase64(mask_image_blob),
        strength: 0.75,
      },
      // @ts-expect-error: TODO, db auth type
      { setLog, setImgSrc, dest, auth: db.auth.authInfoToSend() }
    );
  }

  return (
    <>
      <div style={{ position: "relative", height: 512, width: 512 }}>
        <img
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 512,
            height: 512,
          }}
          ref={inImgRef}
        ></img>
        {inImgLoaded && <MaskCanvas canvasRef={canvasRef} />}
        {imgSrc && (
          <OutputImage
            prompt={inputs.prompt.value.toString()}
            imgSrc={imgSrc}
            log={log}
          />
        )}
      </div>
      <input type="file" ref={inputFile} onChange={fileChange}></input>
      <br />
      <br />

      <Controls go={go} inputs={inputs} uiState={uiState} />
      <Footer />
    </>
  );
}
