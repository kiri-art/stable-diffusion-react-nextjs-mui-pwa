export const MAX_SEED_VALUE = 4294967295;

const defaults = {
  guidance_scale: 7.5,
  image_guidance_scale: 1.5,
  num_inference_steps: 50,
  width: 512,
  height: 512,
  strength: 0.75,
  MODEL_ID: "stabilityai/stable-diffusion-2-1-base",
  PROVIDER_ID: "kiri",
  seed: () => Math.floor(Math.random() * MAX_SEED_VALUE),
  randomizeSeed: true,
  shareInputs: true,
  safety_checker: true,
  sampler: "DPMSolverMultistepScheduler",
  negative_prompt:
    "disfigured, deformed, poorly drawn, extra limbs, blurry, mutated hands, ugly, mutilated, extra fingers, bad anatomy, malformed, missing arms, missing legs, extra arms, extra legs, fused fingers, too many fingers, long neck",
};

export default defaults;
