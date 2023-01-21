import { object, string, number, InferType } from "yup";
import bananaCallInputsSchema from "./bananaCallInputs";

const stableDiffusionInputsSchema = object({
  prompt: string(),
  negative_prompt: string(),
  // n_iter: number().default(1),

  // https://huggingface.co/blog/stable_diffusion
  width: number()
    // .default(512)
    .test(
      "divisible_by_64",
      "must be divisible by 64",
      (value) => !value || value % 64 === 0
    ),
  height: number()
    // .default(512)
    .test(
      "divisible_by_64",
      "must be divisible by 64",
      (value) => !value || value % 64 === 0
    ),
  num_inference_steps: number().default(15).min(0).max(100),
  guidance_scale: number().default(7.5),
  // needs to be pre-processed
  seed: number().min(0).max(4294967295),

  image: string(),
  init_image: string(),
  mask_image: string(),
  strength: number().min(0).max(1),

  // temporary, until we adjust Controls to have callInputs too.
  // note, in the adapter, we move this to callInputs
  MODEL_ID: bananaCallInputsSchema.fields.MODEL_ID,
  PROVIDER_ID: bananaCallInputsSchema.fields.PROVIDER_ID,
  sampler: bananaCallInputsSchema.fields.SCHEDULER,
});

type StableDiffusionInputs = InferType<typeof stableDiffusionInputsSchema>;

export type { StableDiffusionInputs };
export { stableDiffusionInputsSchema };
export default stableDiffusionInputsSchema;
