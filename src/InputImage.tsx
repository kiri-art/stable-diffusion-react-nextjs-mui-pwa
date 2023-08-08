import React from "react";
import { toast } from "react-toastify";
import sendQueue from "./lib/sendQueue";
import { t } from "@lingui/macro";

// Border around inImg{Canvas,Mask}, useful in dev
const DRAW_BORDERS = false;

export function useInputImage({
  setImgSrc,
}: {
  setImgSrc: (src: string) => void;
}) {
  const initImageCanvasRef = React.useRef<HTMLCanvasElement>(null);
  const [initImageLoaded, setInImgLoaded] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const inputFile = React.useRef<HTMLInputElement>(null);
  // Only used for StableDiffusionInpaintPipeline
  // lpw_stable_diffusion gets it from the image
  const [dims, setDims] = React.useState({ width: 0, height: 0 });

  React.useEffect(() => {
    if (sendQueue.has()) {
      const share = sendQueue.get();
      console.log(share);
      if (!share) return;
      readFile(share.files[0]);
      toast(t`Image Loaded`);
    }
  }, []);

  function readFile(file: File) {
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
        // const SD_MAX = [512, 512];
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

        console.log(` Original Image: ${image.width}x${image.height}`);
        console.log(`   Scaled Image: ${width}x${height}`);

        let aspectRatio = width / height;
        console.log("Original aspect: " + aspectRatio);

        // Must be a multple of 64.
        const extraHeight = height % 64;
        const extraWidth = width % 64;
        const adjustHeight = Math.floor(extraHeight / 2);
        const adjustWidth = Math.floor(extraWidth / 2);
        width -= extraWidth;
        height -= extraHeight;

        /*
        // Before we did the crop code, we just scaled:
        if (width % 64 !== 0) {
          width = width - (width % 64);
          height = Math.floor(width / aspectRatio);
          if (height % 64 !== 0) height -= height % 64;
        } else if (height % 64 !== 0) {
          height = height - (height % 64);
          width = Math.floor(height * aspectRatio);
          if (width % 64 !== 0) width -= width % 64;
        }
        */

        aspectRatio = width / height;
        console.log(`    Fixed Image: ${width}x${height}`);
        console.log(`   Fixed Aspect: ${aspectRatio}`);

        const parent = canvas.parentNode as HTMLDivElement;
        parent.style.aspectRatio = aspectRatio.toString();

        canvas.width = width;
        canvas.height = height;
        canvas.style.display = "block";

        const ctx = canvas.getContext("2d" /*, { alpha: false } */);
        if (!ctx) throw new Error("no 2d contxt from canvas");

        // ctx.drawImage(image, 0, 0, width, height);
        ctx.drawImage(
          image,
          /*      sx: */ adjustWidth,
          /*      sy: */ adjustHeight,
          /*  sWidth: */ image.width - adjustWidth,
          /* sHeight: */ image.height - adjustHeight,
          /*      dx: */ 0,
          /*      dy: */ 0,
          /*  dWidth: */ width,
          /* dHeight: */ height
        );

        setInImgLoaded(true);
        setFile(file);
        setDims({ width, height });
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

  return {
    initImageCanvasRef,
    initImageLoaded,
    file,
    inputFile,
    dims,
    fileChange,
  };
}

export default function InputImage({
  initImageCanvasRef,
  inputFile,
  fileChange,
  CanvasAdjacent,
}: {
  initImageCanvasRef: React.RefObject<HTMLCanvasElement>;
  inputFile: React.RefObject<HTMLInputElement>;
  fileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  CanvasAdjacent?: () => JSX.Element;
}) {
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
          // maxHeight: 512,
          border: "1px solid black",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        <canvas
          id="initImageCanvas"
          style={{
            // disable scroll if we're drawing (i.e. no file)
            touchAction: "none", // file ? undefined : "none",

            border: DRAW_BORDERS ? "1px solid green" : undefined,
            position: "absolute",
            top: 0,
            left: 0,
            // display: "none",  (was for Inpaint, not for img2img)
            // Canvas is cropped image size, browser will scale to fill window
            width: "100%",
            height: "100%",
          }}
          ref={initImageCanvasRef}
        ></canvas>
        {CanvasAdjacent && <CanvasAdjacent />}
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
    </>
  );
}
