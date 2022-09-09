import React from "react";
import { db, useGongoUserId, useGongoOne } from "gongo-client-react";
import { useRouter } from "next/router";

import { isDev, REQUIRE_REGISTRATION } from "../src/lib/client-env";
import useModelState, { modelStateValues } from "../src/sd/useModelState";
import txt2img from "../src/adapters/txt2img";
import OutputImage from "../src/OutputImage";
import Controls from "../src/sd/Controls";
import Footer from "../src/sd/Footer";
import { toast } from "react-toastify";

function MaskCanvas({
  canvasRef,
}: {
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
}) {
  const [drawing, setDrawing] = React.useState(false);
  // const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const ctxRef = React.useRef<CanvasRenderingContext2D | null>(null);
  const lastRef = React.useRef<{ x: number; y: number } | null>(null);

  function mouseDown(_event: React.SyntheticEvent) {
    setDrawing(true);
  }
  function mouseUp(_event: React.SyntheticEvent) {
    setDrawing(false);
    lastRef.current = null;
  }
  function mouseMove(event: React.SyntheticEvent) {
    event.preventDefault();
    const ctx = ctxRef.current;
    if (!drawing || !ctx) return;

    // @ts-expect-error: TODO
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
    const ctx = (ctxRef.current =
      // We'll drop the alpha channel anyway when we convert to jpeg
      // For now it's convenient to have transparent background
      canvas && canvas.getContext("2d" /* { alpha: false } */));

    if (ctx) {
      ctx.lineWidth = 30;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.strokeStyle = "white";
    }
  }, [canvasRef]);

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
  const inCanvasRef = React.useRef<HTMLCanvasElement>(null);
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

  function fileChange(event: React.SyntheticEvent) {
    // @ts-expect-error: TODO
    const file = event.target.files[0];

    console.log(file);
    if (!file.type.match(/^image\//)) return toast("Not an image");

    const fileReader = new FileReader();
    fileReader.onload = function (readerEvent) {
      //event.target.result
      // const result = event.target.result;
      //const result = fileReader.result;

      console.log("onload");
      const image = new Image();
      image.onload = function (imageEvent) {
        const canvas = inCanvasRef.current;
        if (!canvas) throw new Error("no canvas");

        // TODO, scaling
        const width = 512; // image.width;
        const height = 512; // image.height;

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d" /*, { alpha: false } */);
        if (!ctx) throw new Error("no 2d contxt from canvas");

        ctx.drawImage(image, 0, 0, width, height);
        setInImgLoaded(true);
        console.log("loaded");
        //const dataUrl = canvas.toDataURL("image/jpeg");
        //const
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
    };
    fileReader.readAsDataURL(file);
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

    if (!inCanvasRef.current) throw new Error("inCanvasRef.current not set");

    const init_image_blob = (await new Promise(
      (resolve) =>
        inCanvasRef.current &&
        inCanvasRef.current.toBlob(
          (blob: Blob | null) => resolve(blob),
          "image/jpeg"
        )
    )) as Blob | null;

    if (!init_image_blob) {
      console.log("no init image blob");
      return;
    }

    const mask_image_blob = (await new Promise(
      (resolve) =>
        canvasRef.current &&
        canvasRef.current.toBlob(
          (blob: Blob | null) => resolve(blob),
          "image/jpeg"
        )
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt="init_image"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 512,
            height: 512,
          }}
          ref={inImgRef}
        ></img>
        <canvas
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: 512,
            height: 512,
          }}
          ref={inCanvasRef}
        ></canvas>
        {inImgLoaded && <MaskCanvas canvasRef={canvasRef} />}
      </div>
      <input type="file" ref={inputFile} onChange={fileChange}></input>
      <br />
      {imgSrc && (
        <OutputImage
          prompt={inputs.prompt.value.toString()}
          imgSrc={imgSrc}
          log={log}
        />
      )}
      <br />

      <Controls go={go} inputs={inputs} uiState={uiState} />
      <Footer />
    </>
  );
}
