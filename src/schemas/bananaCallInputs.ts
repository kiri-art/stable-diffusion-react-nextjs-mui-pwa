import { object, number, string, boolean, InferType } from "yup";
import models from "../config/models";

const bananaCallInputsSchema = object({
  MODEL_ID: string().oneOf(Object.keys(models)),
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
