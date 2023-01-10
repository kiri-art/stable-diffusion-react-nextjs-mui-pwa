import { object, number, string, boolean, InferType } from "yup";

const bananaCallInputsSchema = object({
  MODEL_ID: string().oneOf([
    "wd-1-4-anime_e1",
    "prompthero/openjourney-v2",
    "Linaqruf/anything-v3.0",
    "stabilityai/stable-diffusion-2-1",
    "stabilityai/stable-diffusion-2-1-base",
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
  MODEL_URL: string(),
  PROVIDER_ID: number().oneOf([1, 2]),
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
  custom_pipeline_method: string(),
  SCHEDULER: string().oneOf([
    "PNDM", // backcompat
    "DDIM", // backcompat
    "LMS", // backcompat
    "LMSDiscreteScheduler",
    "DDIMScheduler",
    "PNDMScheduler",
    "EulerAncestralDiscreteScheduler",
    "EulerDiscreteScheduler",
    "DPMSolverMultistepScheduler",
  ]), // .default("DDIM"),
  startRequestId: string(),
  safety_checker: boolean(),
});

type BananaCallInputs = InferType<typeof bananaCallInputsSchema>;

export type { BananaCallInputs };
export { bananaCallInputsSchema };
export default bananaCallInputsSchema;
