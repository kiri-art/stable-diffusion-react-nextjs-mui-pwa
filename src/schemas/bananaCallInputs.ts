import { object, string, InferType } from "yup";

const bananaCallInputsSchema = object({
  // Dev only.  Not passed to model.
  // This should probably go somewhere else.
  MODEL_ID: string().oneOf([
    "CompVis/stable-diffusion-v1-4",
    "hakurei/waifu-diffusion",
    "rinna/japanese-stable-diffusion",
  ]),
  // .default("CompVis/stable-diffusion-v1-4"),
  PIPELINE: string().oneOf([
    "StableDiffusionPipeline",
    "StableDiffusionImg2ImgPipeline",
    "StableDiffusionInpaintPipeline",
  ]),
  // .default("StableDiffusionPipeline"),
  SCHEDULER: string().oneOf(["PNDM", "DDIM", "LMS"]), // .default("DDIM"),
  startRequestId: string(),
});

type BananaCallInputs = InferType<typeof bananaCallInputsSchema>;

export type { BananaCallInputs };
export { bananaCallInputsSchema };
export default bananaCallInputsSchema;
