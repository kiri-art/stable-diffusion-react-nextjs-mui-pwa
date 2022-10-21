export const MAX_SEED_VALUE = 4294967295;

const defaults = {
  guidance_scale: 7.5,
  num_inference_steps: 50,
  width: 512,
  height: 512,
  strength: 0.75,
  MODEL_ID: "runwayml/stable-diffusion-v1-5",
  seed: () => Math.floor(Math.random() * MAX_SEED_VALUE),
  randomizeSeed: true,
  shareInputs: false,
  safety_checker: true,
  sampler: "LMS",
  negative_prompt:
    "disfigured, deformed, poorly drawn, extra limbs, blurry, mutated hands, ugly, mutilated, extra fingers, bad anatomy, malformed, missing arms, missing legs, extra arms, extra legs, fused fingers, too many fingers, long neck",
};

export default defaults;
