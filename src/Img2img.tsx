import React from "react";
import { db, useGongoUserId, useGongoOne } from "gongo-client-react";
import { useRouter } from "next/router";

import { IconButton, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { Clear, Redo, Undo } from "@mui/icons-material";

import { isDev, REQUIRE_REGISTRATION } from "../src/lib/client-env";
import useModelState, { modelStateValues } from "../src/sd/useModelState";
import txt2img from "../src/adapters/txt2img";
import OutputImage from "../src/OutputImage";
import Controls from "../src/sd/Controls";
import Footer from "../src/sd/Footer";
//import { toast } from "react-toastify";
// import { Trans } from "@lingui/macro";

// Border around inImg{Canvas,Mask}, useful in dev
// const DRAW_BORDERS = false;

const colors = [
  "black",
  "gray",
  "white",
  "red",
  "orange",
  "yellow",
  "green",
  "purple",
  "sienna",
  "aqua",
  "blue",
];

interface Op {
  style: {
    color: string;
  };
  steps: [number, number][];
}

function Canvas({
  file,
  initImageCanvasRef,
}: {
  file: File | null;
  initImageCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
}) {
  //const [drawing, setDrawing] = React.useState(false);
  // const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const ctxRef = React.useRef<CanvasRenderingContext2D | null>(null);
  const lastRef = React.useRef<{ x: number; y: number } | null>(null);
  const isDrawing = React.useRef(false);
  const [color, setColor] = React.useState("black");
  const colorRef = React.useRef("black");

  /*
   * [
   *   [ [x,y], [x,y], [x,y], ... ]  // op #0
   * ]
   */
  const ops = React.useRef<Op[]>([]);
  const opsIndexRef = React.useRef(0);
  const [opsCount, setOpsCount] = React.useState(0);
  const [opsIndex, setOpsIndex] = React.useState(0);
  // console.log({ opsIndex, opsCount });

  React.useEffect(() => {
    const canvas = initImageCanvasRef.current;
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
      ctx.strokeStyle = "black";
    }

    function mouseDown(_event: MouseEvent | TouchEvent) {
      isDrawing.current = true;
      if (ctx) ctx.strokeStyle = colorRef.current;
      //setDrawing(true);
      console.log({
        opsIndexRef: opsIndexRef.current,
        opsLength: ops.current.length,
      });

      if (opsIndexRef.current === ops.current.length) {
        ops.current.push({ style: { color: colorRef.current }, steps: [] });
      } else {
        ops.current.splice(
          opsIndexRef.current,
          ops.current.length - opsIndexRef.current,
          { style: { color: colorRef.current }, steps: [] }
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
      const canvas = initImageCanvasRef.current;
      const ctx = ctxRef.current;
      if (!isDrawing.current || !ctx || !canvas) return;

      event.preventDefault();

      const tEvent = event instanceof TouchEvent ? event.touches[0] : event;

      const mouse = {
        x:
          (tEvent.pageX - canvas.offsetLeft) *
          (canvas.width / canvas.clientWidth),
        y:
          (tEvent.pageY - canvas.offsetTop) *
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
      const lastDraw = op.steps[op.steps.length - 1];
      if (last && !(lastDraw[0] === last.x && lastDraw[1] === last.y))
        op.steps.push([last.x, last.y]);
      op.steps.push([mouse.x, mouse.y]);
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
  }, [initImageCanvasRef, file]);

  function redraw() {
    const canvas = initImageCanvasRef.current;
    const ctx = ctxRef.current;
    if (!(canvas && ctx)) throw new Error("canvas or ctx not defined");
    ctx && ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < opsIndexRef.current; i++) {
      const op = ops.current[i];
      ctx.strokeStyle = op.style.color;
      const steps = op.steps;
      for (let j = 1; j < steps.length; j++) {
        ctx.beginPath();
        ctx.moveTo(steps[j - 1][0], steps[j - 1][1]);
        ctx.lineTo(steps[j][0], steps[j][1]);
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
          // position: "absolute",
          // top: 0,
          // left: 0,
          touchAction: "none",
          // border: DRAW_BORDERS ? "1px solid red" : undefined,
          // Canvas is cropped image size, browser will scale to fill window
          width: "100%",
          aspectRatio: "1",
          border: "1px solid black",
        }}
        width={512}
        height={512}
        ref={initImageCanvasRef}
      />
      <div>
        <IconButton onClick={clearOps}>
          <Clear />
        </IconButton>
        <IconButton disabled={opsIndex === 0} onClick={undoOp}>
          <Undo />
        </IconButton>
        <IconButton disabled={opsIndex === opsCount} onClick={redoOp}>
          <Redo />
        </IconButton>
        <ToggleButtonGroup
          sx={{
            position: "relative",
            top: 0,
            left: 10,
          }}
          value={color}
          onChange={(_event, value) => setColor((colorRef.current = value))}
          exclusive
          aria-label="color"
        >
          {colors.map((color) => (
            <ToggleButton
              sx={{
                background: color,
                color: color,
                fontSize: "5%",
                "&:hover": {
                  background: color,
                },
                "&.MuiToggleButton-root.Mui-selected": {
                  background: color,
                  color: "black",
                },
              }}
              key={color}
              value={color}
              aria-label={color}
            >
              X
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
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

export default function Img2img() {
  // const inputFile = React.useRef<HTMLInputElement>(null);
  const initImageCanvasRef = React.useRef<HTMLCanvasElement>(null);
  // const [initImageLoaded, setInImgLoaded] = React.useState(false);
  const [file, _setFile] = React.useState<File | null>(null);

  const [imgSrc, setImgSrc] = React.useState<string>("");
  const [log, setLog] = React.useState([] as Array<string>);
  const [dest, setDest] = React.useState(
    isDev ? "banana-local" : "banana-remote"
  );

  const uiState = { dest: { value: dest, set: setDest } };

  const inputs = useModelState(inpaintState);

  /*
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

        const ctx = canvas.getContext("2d" /*, { alpha: false } */ /*);
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
  */

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

    console.log({
      ...modelStateValues(inputs),
      prompt: inputs.prompt.value,
      init_image: await blobToBase64(init_image_blob),
      strength: inputs.strength.value,
    });

    // return;

    await txt2img(
      {
        ...modelStateValues(inputs),
        prompt: inputs.prompt.value,
        init_image: await blobToBase64(init_image_blob),
        strength: inputs.strength.value,
      },
      {
        setLog,
        setImgSrc,
        dest,
        // @ts-expect-error: TODO, db auth type
        auth: db.auth.authInfoToSend(),
        MODEL_NAME: "IMG2IMG",
      }
    );
  }

  return (
    <>
      <Canvas initImageCanvasRef={initImageCanvasRef} file={file} />
      {/* 
      <input type="file" ref={inputFile} onChange={fileChange}></input>
      */}
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
