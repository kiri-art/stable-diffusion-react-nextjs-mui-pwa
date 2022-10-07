import { ModelState } from "../sd/useModelState";

export default function sharedInputTextFromInputs(
  inputs: ModelState,
  always = false
) {
  const prompt = inputs.prompt.value;
  if (!(always || inputs.shareInputs.value)) return prompt;

  return (
    `${prompt}, CFG: ${inputs.guidance_scale.value}, ` +
    `steps: ${inputs.num_inference_steps.value}, ` +
    `seed: ${inputs.seed.value}, negative_prompt: ${inputs.negative_prompt.value}"`
  );
}
