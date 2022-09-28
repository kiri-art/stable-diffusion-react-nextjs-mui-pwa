import React, { useMemo } from "react";
import { t, Trans } from "@lingui/macro";
import { useGongoUserId, useGongoOne } from "gongo-client-react";
import { useRouter } from "next/router";
import bananaFetch from "../src/bananaFetch";
import {
  upsampleCallInputsSchema,
  upsampleModelInputsSchema,
} from "../src/schemas";

import {
  Box,
  Container,
  FormControl,
  FormControlLabel,
  FormGroup,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Tooltip,
} from "@mui/material";

import { isDev, REQUIRE_REGISTRATION } from "../src/lib/client-env";
import MyAppBar from "../src/MyAppBar";
import defaults from "../src/sd/defaults";
import { toast } from "react-toastify";
import OutputImage from "../src/OutputImage";
import GoButton from "../src/GoButton";
import blobToBase64 from "../src/lib/blobToBase64";
import { HelpOutline } from "@mui/icons-material";
import { ModelState } from "../src/sd/useModelState";

function ModelMenuItem({ value, desc }: { value: string; desc: string }) {
  return (
    <Box sx={{ textAlign: "center", width: "100%" }}>
      <div style={{ fontWeight: "bold" }}>{value}</div>
      <div>{desc}</div>
    </Box>
  );
}

function ModelSelect({
  value,
  setValue,
  defaultValue,
}: {
  value: string;
  setValue: React.Dispatch<React.SetStateAction<string>>;
  defaultValue: typeof defaults.MODEL_ID;
}) {
  return useMemo(
    () => (
      <FormControl fullWidth>
        <InputLabel id="model-select-label">
          <Trans>Model</Trans>
        </InputLabel>
        <Select
          id="model-select"
          label={t`Model`}
          labelId="model-select-label"
          value={value}
          defaultValue={defaultValue}
          onChange={(event) => setValue(event.target.value)}
          size="small"
        >
          {/* Unfortunately <Select /> relies on having direct <MenuItem /> children */}
          <MenuItem
            value="RealESRGAN_x4plus"
            sx={{ textAlign: "center", width: "100%" }}
          >
            <ModelMenuItem
              value="RealESRGAN_x4plus"
              desc={t`Original model, best for most cases.`}
            />
          </MenuItem>

          <MenuItem
            value="RealESRGAN_x4plus_anime_6B"
            sx={{ textAlign: "center", width: "100%" }}
          >
            <ModelMenuItem
              value="RealESRGAN_x4plus_anime_6B"
              desc={t`Best for Anime`}
            />
          </MenuItem>

          <MenuItem
            value="realesr-general-x4v3"
            sx={{ textAlign: "center", width: "100%" }}
          >
            <ModelMenuItem
              value="realesr-general-x4v3"
              desc={t`General - v3`}
            />
          </MenuItem>
        </Select>
      </FormControl>
    ),
    [value, setValue, defaultValue]
  );
}

function FaceEnhance({
  value,
  setValue,
}: {
  value: boolean;
  setValue: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return React.useMemo(() => {
    return (
      <Grid item xs={12} sm={6} md={4} lg={3}>
        <Stack
          direction="row"
          spacing={0}
          justifyContent="center"
          alignItems="center"
        >
          <FormGroup sx={{ alignItems: "center" }}>
            <FormControlLabel
              sx={{ mr: 0 }}
              control={
                <Switch
                  checked={value}
                  onChange={(event) => setValue(event.target.checked)}
                />
              }
              label={
                <Box>
                  <Trans>Face Enhance</Trans>
                </Box>
              }
            />
          </FormGroup>
          <Tooltip
            title={
              <Box>
                <Trans>
                  Face Restoration. Good for photorealistic images, bad for
                  anime.
                </Trans>
              </Box>
            }
            enterDelay={0}
            enterTouchDelay={0}
            leaveDelay={0}
            leaveTouchDelay={3000}
          >
            <HelpOutline
              sx={{ verticalAlign: "bottom", opacity: 0.5, ml: 1 }}
            />
          </Tooltip>
        </Stack>
      </Grid>
    );
  }, [value, setValue]);
}

export default function Upsample() {
  const inputImage = React.useRef<HTMLImageElement>(null);
  const [modelId, setModelId] = React.useState("RealESRGAN_x4plus");
  const [faceEnhance, setFaceEnhance] = React.useState(true);

  const [imgSrc, setImgSrc] = React.useState("");
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
      console.log("inputImage loaded from disk");
      // const image = new Image();
      const image = inputImage.current;
      if (!image) throw new Error("no inputImage.current");
      image.onload = function (_imageEvent) {
        console.log("inputImage loaded to image");
        const aspectRatio = image.width / image.height;
        const parentNode = image.parentNode as HTMLDivElement;
        if (parentNode)
          parentNode.style["aspectRatio"] = `${image.width} / ${image.height}`;
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

  async function go(event: React.SyntheticEvent) {
    event.preventDefault();

    if (REQUIRE_REGISTRATION) {
      // TODO, record state in URL, e.g. #prompt=,etc
      if (!user) return router.push("/login?from=/txt2img");
      if (!(user.credits.free > 0 || user.credits.paid > 0))
        return router.push("/credits");
    }

    if (!inputImage.current) throw new Error("no inputImage.current");
    const input_image_blob = await fetch(inputImage.current.src).then((res) =>
      res.blob()
    );

    if (!input_image_blob) {
      console.log("no init image blob");
      return;
    }

    const modelInputs = upsampleModelInputsSchema.cast({
      input_image: await blobToBase64(input_image_blob),
      face_enhance: faceEnhance,
    });
    const callInputs = upsampleCallInputsSchema.cast({ MODEL_ID: modelId });

    // setLog(["[WebUI] Executing..."]);
    setImgSrc("/img/placeholder.png");

    setRequestStartTime(Date.now());
    setRequestEndTime(null);

    const result = await bananaFetch(
      "/api/banana-upsample",
      modelInputs,
      callInputs,
      {
        setLog,
        setImgSrc,
        dest,
        // @ts-expect-error: TODO, db auth type
        auth: db.auth.authInfoToSend(),
      }
    );

    console.log(result);

    setRequestEndTime(Date.now());
  }

  return (
    <>
      <MyAppBar title={t`Upsampling`} />
      <Container maxWidth="lg" sx={{ my: 2 }}>
        <Box
          sx={{
            border: "1px solid black",
            width: "100%",
            maxWidth: 512,
            maxHeight: 512,
            aspectRatio: "1",
            marginLeft: "auto",
            marginRight: "auto",
            position: "relative",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="input image"
            ref={inputImage}
            src="/img/placeholder.png"
            style={{ width: "100%", position: "absolute" }}
          ></img>
        </Box>
        <div style={{ textAlign: "center" }}>
          <input type="file" onChange={fileChange}></input>
        </div>
        {imgSrc && (
          <OutputImage
            text={"file + upsampled"}
            imgSrc={imgSrc}
            nsfw={false}
            log={log}
            requestStartTime={requestStartTime}
            requestEndTime={requestEndTime}
          />
        )}
        <form onSubmit={go}>
          <GoButton disabled={false} dest={dest} setDest={setDest} />
          <ModelSelect
            value={modelId}
            setValue={setModelId}
            defaultValue="RealESRGAN_x4plus"
          />
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <FaceEnhance value={faceEnhance} setValue={setFaceEnhance} />
          </Grid>
        </form>
      </Container>
    </>
  );
}
