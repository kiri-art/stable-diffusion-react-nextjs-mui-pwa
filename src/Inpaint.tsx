import React from "react";
import { db, useGongoUserId, useGongoOne } from "gongo-client-react";
import { useRouter } from "next/router";

import { IconButton } from "@mui/material";
import { Clear, Redo, Undo } from "@mui/icons-material";

import { isDev, REQUIRE_REGISTRATION } from "../src/lib/client-env";
import useModelState, { modelStateValues } from "../src/sd/useModelState";
import txt2img from "../src/adapters/txt2img";
import OutputImage from "../src/OutputImage";
import Controls from "../src/sd/Controls";
import Footer from "../src/sd/Footer";
import { toast } from "react-toastify";
// import { Trans } from "@lingui/macro";
import locales, { defaultLocale } from "../src/lib/locales";

// Border around inImg{Canvas,Mask}, useful in dev
const DRAW_BORDERS = false;

function MaskCanvas({
  file,
  initImageCanvasRef,
  maskImageCanvasRef,
}: {
  file: File | null;
  initImageCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  maskImageCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
}) {
  //const [drawing, setDrawing] = React.useState(false);
  // const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const ctxRef = React.useRef<CanvasRenderingContext2D | null>(null);
  const lastRef = React.useRef<{ x: number; y: number } | null>(null);
  const isDrawing = React.useRef(false);
  const router = useRouter();
  const locale = locales[router.locale || defaultLocale];
  const dir = locale.dir as "ltr" | "rtl";

  /*
   * [
   *   [ [x,y], [x,y], [x,y], ... ]  // op #0
   * ]
   */
  const ops = React.useRef<Array<Array<[number, number]>>>([]);
  const opsIndexRef = React.useRef(0);
  const [opsCount, setOpsCount] = React.useState(0);
  const [opsIndex, setOpsIndex] = React.useState(0);
  // console.log({ opsIndex, opsCount });

  React.useEffect(() => {
    const canvas = maskImageCanvasRef.current;
    if (!canvas) throw new Error("no canvas ref");

    const initImageCanvas = initImageCanvasRef.current;
    if (!initImageCanvas) throw new Error("No initImageCanvas");

    canvas.width = initImageCanvas.width;
    canvas.height = initImageCanvas.height;

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

    function mouseDown(_event: MouseEvent | TouchEvent) {
      isDrawing.current = true;
      //setDrawing(true);
      console.log({
        opsIndexRef: opsIndexRef.current,
        opsLength: ops.current.length,
      });

      if (opsIndexRef.current === ops.current.length) {
        ops.current.push([]);
      } else {
        ops.current.splice(
          opsIndexRef.current,
          ops.current.length - opsIndexRef.current,
          []
        );
      }
      setOpsCount(ops.current.length);
      setOpsIndex((opsIndexRef.current = ops.current.length));
    }

    function mouseUp(_event: MouseEvent | TouchEvent) {
      isDrawing.current = false;
      // setDrawing(false);
      lastRef.current = null;
    }

    function mouseMove(event: MouseEvent | TouchEvent) {
      const canvas = maskImageCanvasRef.current;
      const ctx = ctxRef.current;
      if (!isDrawing.current || !ctx || !canvas) return;

      event.preventDefault();

      const tEvent = event instanceof TouchEvent ? event.touches[0] : event;
      const parent = canvas.parentNode as HTMLDivElement;

      const mouse = {
        x:
          (tEvent.pageX - parent.offsetLeft) *
          (canvas.width / canvas.clientWidth),
        y:
          (tEvent.pageY - parent.offsetTop) *
          (canvas.height / canvas.clientHeight),
      };

      const last = lastRef.current;
      if (last) {
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(mouse.x, mouse.y);
        ctx.closePath();
        ctx.stroke();
      }
      lastRef.current = { x: mouse.x, y: mouse.y };

      const op = ops.current[ops.current.length - 1];
      const lastDraw = op[op.length - 1];
      if (last && !(lastDraw[0] === last.x && lastDraw[1] === last.y))
        op.push([last.x, last.y]);
      op.push([mouse.x, mouse.y]);
    }

    canvas.addEventListener("mousedown", mouseDown);
    canvas.addEventListener("touchstart", mouseDown, { passive: false });
    canvas.addEventListener("mousemove", mouseMove);
    canvas.addEventListener("touchmove", mouseMove, { passive: false });
    canvas.addEventListener("mouseup", mouseUp);
    canvas.addEventListener("touchend", mouseUp, { passive: false });
    return () => {
      ctx && ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.removeEventListener("mousedown", mouseDown);
      canvas.removeEventListener("touchstart", mouseDown);
      canvas.removeEventListener("mousemove", mouseMove);
      canvas.removeEventListener("touchmove", mouseMove);
      canvas.removeEventListener("mousedown", mouseUp);
      canvas.removeEventListener("touchend", mouseUp);
    };
  }, [initImageCanvasRef, maskImageCanvasRef, file]);

  function redraw() {
    const canvas = maskImageCanvasRef.current;
    const ctx = ctxRef.current;
    if (!(canvas && ctx)) throw new Error("canvas or ctx not defined");
    ctx && ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < opsIndexRef.current; i++) {
      const op = ops.current[i];
      for (let j = 1; j < op.length; j++) {
        ctx.beginPath();
        ctx.moveTo(op[j - 1][0], op[j - 1][1]);
        ctx.lineTo(op[j][0], op[j][1]);
        ctx.closePath();
        ctx.stroke();
      }
    }
  }
  function clearOps() {
    ops.current = [];
    setOpsIndex((opsIndexRef.current = 0));
    setOpsCount(0);
    redraw();
  }
  function undoOp() {
    setOpsIndex(--opsIndexRef.current);
    redraw();
  }
  function redoOp() {
    setOpsIndex(++opsIndexRef.current);
    redraw();
  }

  return (
    <>
      <canvas
        id="maskImageCanvas"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          touchAction: "none",
          border: DRAW_BORDERS ? "1px solid red" : undefined,
          // Canvas is cropped image size, browser will scale to fill window
          width: "100%",
          height: "100%",
        }}
        ref={maskImageCanvasRef}
      />
      <div
        style={{
          position: "absolute",
          bottom: -38,
          [dir == "ltr" ? "right" : "left"]: 10,
        }}
      >
        <IconButton onClick={clearOps}>
          <Clear />
        </IconButton>
        <IconButton disabled={opsIndex === 0} onClick={undoOp}>
          <Undo />
        </IconButton>
        <IconButton disabled={opsIndex === opsCount} onClick={redoOp}>
          <Redo />
        </IconButton>
      </div>
    </>
  );
}

const inpaintState = [
  "prompt",
  "strength",
  "num_inference_steps",
  "guidance_scale",
];

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
  const inputFile = React.useRef<HTMLInputElement>(null);
  const initImageCanvasRef = React.useRef<HTMLCanvasElement>(null);
  const maskImageCanvasRef = React.useRef<HTMLCanvasElement>(null);
  const [initImageLoaded, setInImgLoaded] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);

  const [imgSrc, setImgSrc] = React.useState<string>("");
  const [log, setLog] = React.useState([] as Array<string>);
  const [dest, setDest] = React.useState(
    isDev ? "banana-local" : "banana-remote"
  );

  const uiState = { dest: { value: dest, set: setDest } };

  const inputs = useModelState(inpaintState);

  function fileChange(event: React.SyntheticEvent) {
    const target = event.target as HTMLInputElement;
    if (!(target instanceof HTMLInputElement))
      throw new Error("Event target is not an HTMLInputElement");

    // @ts-expect-error: I can't be any clearer, typescript
    const file = target.files[0];

    console.log(file);
    if (!file.type.match(/^image\//)) return toast("Not an image");

    setImgSrc("");

    const fileReader = new FileReader();
    fileReader.onload = function (readerEvent) {
      //event.target.result
      // const result = event.target.result;
      //const result = fileReader.result;

      console.log("initImage loaded from disk");
      const image = new Image();
      image.onload = function (_imageEvent) {
        console.log("initImage loaded to image");
        const canvas = initImageCanvasRef.current;
        if (!canvas) throw new Error("no canvas");

        // Later we could get fancy and clip around just the mask at send time.
        let width, height;
        // const SD_MAX = [1024, 768]; // can also be 768x1024
        const SD_MAX = [512, 512];

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

        // Need to clip at 8.

        const aspectRatio = width / height;

        const parent = canvas.parentNode as HTMLDivElement;
        parent.style.aspectRatio = aspectRatio.toString();

        canvas.width = width;
        canvas.height = height;
        canvas.style.display = "block";

        const ctx = canvas.getContext("2d" /*, { alpha: false } */);
        if (!ctx) throw new Error("no 2d contxt from canvas");

        ctx.drawImage(image, 0, 0, width, height);
        setInImgLoaded(true);
        setFile(file);
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

    const mask_image_blob = (await new Promise(
      (resolve) =>
        maskImageCanvasRef.current &&
        maskImageCanvasRef.current.toBlob(
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
      strength: inputs.strength.value,
    });

    // return;

    await txt2img(
      {
        ...modelStateValues(inputs),
        prompt: inputs.prompt.value,
        init_image: await blobToBase64(init_image_blob),
        mask_image: await blobToBase64(mask_image_blob),
        strength: inputs.strength.value,
      },
      {
        setLog,
        setImgSrc,
        dest,
        // @ts-expect-error: TODO, db auth type
        auth: db.auth.authInfoToSend(),
        MODEL_NAME: "INPAINT",
      }
    );
  }

  return (
    <>
      <div
        id="imageOuterDiv"
        style={{
          position: "relative",
          width: "100%",
          // height: "calc(100vw - 46px)",
          aspectRatio: "1", // initial value; updated on imgLoad
          maxWidth: 512,
          maxHeight: 512,
          border: "1px solid black",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            padding: "20px",
            display: initImageLoaded ? "none" : "block",
            direction: "ltr",
            width: "100%",
            height: "100%",
            overflow: "auto",
          }}
        >
          <b>Quick Start</b>

          <ol>
            <li>
              Upload an image with button below
              <br />
              (drag &amp; drop, sharing coming soon)
            </li>
            <li>Use mouse/finger to draw mask over it</li>
            <li>Adjust prompt and GO</li>
          </ol>

          <div style={{ fontSize: "85%" }}>
            <p>Roadmap / Notes / Coming Soon</p>

            <ul>
              <li>Image will be scaled to max 512x512</li>
              <li>TODO: Better instructions / guide</li>
            </ul>
          </div>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <canvas
          id="initImageCanvas"
          style={{
            border: DRAW_BORDERS ? "1px solid green" : undefined,
            position: "absolute",
            top: 0,
            left: 0,
            display: "none",
            // Canvas is cropped image size, browser will scale to fill window
            width: "100%",
            height: "100%",
          }}
          ref={initImageCanvasRef}
        ></canvas>
        {initImageLoaded && (
          <MaskCanvas
            file={file}
            initImageCanvasRef={initImageCanvasRef}
            maskImageCanvasRef={maskImageCanvasRef}
          />
        )}
      </div>
      <div
        style={{
          width: "100%",
          maxWidth: 512,
          margin: "auto",
        }}
      >
        <input type="file" ref={inputFile} onChange={fileChange}></input>
      </div>
      {imgSrc && (
        <OutputImage
          prompt={inputs.prompt.value.toString()}
          imgSrc={imgSrc}
          log={log}
        />
      )}

      <Controls go={go} inputs={inputs} uiState={uiState} />
      <Footer />
    </>
  );
}
