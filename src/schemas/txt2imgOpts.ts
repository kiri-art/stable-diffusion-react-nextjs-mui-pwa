import { object, string, number, InferType } from "yup";

const txt2imgOptsSchema = object({
  prompt: string(),
  // n_iter: number().default(1),

  // https://huggingface.co/blog/stable_diffusion
  width: number()
    .default(512)
    .test(
      "divisible_by_8",
      "must be divisible by 8",
      (value) => value % 8 === 0
    ),
  height: number()
    .default(512)
    .test(
      "divisible_by_8",
      "must be divisible by 8",
      (value) => value % 8 === 0
    ),
  num_inference_steps: number().default(15),
  guidance_scale: number().default(7.5),
  // needs to be pre-processed
  seed: number().min(0).max(4294967295),
});

type Txt2ImgOpts = InferType<typeof txt2imgOptsSchema>;

export type { Txt2ImgOpts };
export { txt2imgOptsSchema };
export default txt2imgOptsSchema;
