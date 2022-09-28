import { ModelState } from "../sd/useModelState";

export default function sharedInputTextFromInputs(
  inputs: ModelState,
  always = false
) {
  const prompt = inputs.prompt.value;
  const text =
    prompt +
    (always || inputs.shareInputs.value
      ? `, CFG: ${inputs.guidance_scale.value}, steps: ${inputs.num_inference_steps.value}, seed: ${inputs.seed.value}`
      : "");
  return text;
}
