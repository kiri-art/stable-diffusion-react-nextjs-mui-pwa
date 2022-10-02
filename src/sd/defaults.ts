export const MAX_SEED_VALUE = 4294967295;

const defaults = {
  guidance_scale: 7.5,
  num_inference_steps: 50,
  width: 512,
  height: 512,
  strength: 0.75,
  MODEL_ID: "CompVis/stable-diffusion-v1-4",
  seed: () => Math.floor(Math.random() * MAX_SEED_VALUE),
  randomizeSeed: true,
  shareInputs: false,
  safety_checker: true,
  sampler: "LMS",
};

export default defaults;
