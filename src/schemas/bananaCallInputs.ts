import { object, string, boolean, InferType } from "yup";

const bananaCallInputsSchema = object({
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
  safety_checker: boolean(),
});

type BananaCallInputs = InferType<typeof bananaCallInputsSchema>;

export type { BananaCallInputs };
export { bananaCallInputsSchema };
export default bananaCallInputsSchema;
