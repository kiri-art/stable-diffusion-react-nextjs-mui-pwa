export default function calculateCredits(
  callInputs: Record<string, unknown>,
  modelInputs: Record<string, unknown>
) {
  let cost = 0.2;
  if (callInputs.use_extra) {
    if (callInputs.use_extra === "upsample") cost = 0.2;
  }

  const { width, height } = modelInputs;
  if (width) cost = (cost / 512) * (width as number);
  if (height) cost = (cost / 512) * (height as number);

  const { num_inference_steps } = modelInputs;
  if (num_inference_steps) cost = (cost / 20) * (num_inference_steps as number);

  return cost;
}
