import { object, string, boolean, InferType } from "yup";

const bananaCallInputsSchema = object({
  MODEL_ID: string().oneOf([
    "stabilityai/stable-diffusion-2",
    "stabilityai/stable-diffusion-2-base",
    "CompVis/stable-diffusion-v1-4",
    "runwayml/stable-diffusion-v1-5",
    "runwayml/stable-diffusion-inpainting",
    "hakurei/waifu-diffusion",
    "hakurei/waifu-diffusion-v1-3",
    "hakurei/waifu-diffusion-v1-3-full",
    "rinna/japanese-stable-diffusion",
  ]),
  // .default("CompVis/stable-diffusion-v1-4"),
  PIPELINE: string().oneOf([
    "StableDiffusionPipeline",
    "StableDiffusionImg2ImgPipeline",
    "StableDiffusionInpaintPipeline",
    "StableDiffusionInpaintPipelineLegacy",
    "JapaneseStableDiffusionPipeline",
    "JapaneseStableDiffusionImg2ImgPipeline",
    "JapaneseStableDiffusionInpaintPipeline",
  ]),
  // .default("StableDiffusionPipeline"),
  SCHEDULER: string().oneOf([
    "PNDM", // backcompat
    "DDIM", // backcompat
    "LMS", // backcompat
    "LMSDiscreteScheduler",
    "DDIMScheduler",
    "PNDMScheduler",
    "EulerAncestralDiscreteScheduler",
    "EulerDiscreteScheduler",
  ]), // .default("DDIM"),
  startRequestId: string(),
  safety_checker: boolean(),
});

type BananaCallInputs = InferType<typeof bananaCallInputsSchema>;

export type { BananaCallInputs };
export { bananaCallInputsSchema };
export default bananaCallInputsSchema;
