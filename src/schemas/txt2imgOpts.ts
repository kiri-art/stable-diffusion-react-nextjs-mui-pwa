import { object, string, number, InferType } from "yup";

const txt2imgOptsSchema = object({
  prompt: string(),
  // n_iter: number().default(1),

  // https://huggingface.co/blog/stable_diffusion
  width: number()
    // .default(512)
    .test(
      "divisible_by_64",
      "must be divisible by 64",
      (value) => !!value && value % 64 === 0
    ),
  height: number()
    // .default(512)
    .test(
      "divisible_by_64",
      "must be divisible by 64",
      (value) => !!value && value % 64 === 0
    ),
  num_inference_steps: number().default(15).min(0).max(100),
  guidance_scale: number().default(7.5),
  // needs to be pre-processed
  seed: number().min(0).max(4294967295),

  init_image: string(),
  mask_image: string(),
  strength: number().min(0).max(1),

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
});

type Txt2ImgOpts = InferType<typeof txt2imgOptsSchema>;

export type { Txt2ImgOpts };
export { txt2imgOptsSchema };
export default txt2imgOptsSchema;
