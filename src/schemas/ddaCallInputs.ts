import { object, string, boolean, InferType, array } from "yup";
import models from "../config/models";
import Providers from "../config/providers";

const ddaCallInputsSchema = object({
  MODEL_ID: string().oneOf(Object.keys(models)),
  MODEL_URL: string(),
  MODEL_REVISION: string(),
  MODEL_PRECISION: string(),
  CHECKPOINT_URL: string().optional(),
  PROVIDER_ID: string().oneOf(Providers.map((p) => p.id)),
  // .default("CompVis/stable-diffusion-v1-4"),
  PIPELINE: string().oneOf([
    "AutoPipelineForText2Image",
    "AutoPipelineForImage2Image",
    "AutoPipelineForImageInpainting",
    "StableDiffusionPipeline",
    "StableDiffusionImg2ImgPipeline",
    "StableDiffusionInpaintPipeline",
    "StableDiffusionInpaintPipelineLegacy",
    "StableDiffusionXLPipeline",
    "StableDiffusionXLImg2ImgPipeline",
    "StableDiffusionXLInpaintPipeline",
    "JapaneseStableDiffusionPipeline",
    "JapaneseStableDiffusionImg2ImgPipeline",
    "JapaneseStableDiffusionInpaintPipeline",
    "lpw_stable_diffusion",
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
  textual_inversions: array().of(
    string().matches(
      /https:\/\/civitai.com\/api\/download\/models\/(\d+)#fname=(.*)&token=(.*)/
    )
  ),
  lora_weights: array().of(
    string().matches(
      /https:\/\/civitai.com\/api\/download\/models\/(\d+)#fname=(.*)/
    )
  ),
  compel_prompts: boolean(),
});

type ddaCallInputs = InferType<typeof ddaCallInputsSchema>;

export type { ddaCallInputs };
export { ddaCallInputsSchema };
export default ddaCallInputsSchema;
