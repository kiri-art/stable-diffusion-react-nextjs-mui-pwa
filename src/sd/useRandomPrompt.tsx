import { useMemo } from "react";
import models from "../config/models";

function getRandomPrompt(MODEL_ID: string) {
  let prompts = models[MODEL_ID].randomPrompts;
  if (!prompts) return "";

  if (!Array.isArray(prompts))
    prompts = models[prompts.$from].randomPrompts as string[];

  return prompts[Math.floor(Math.random() * prompts.length)];
}

function useRandomPrompt(MODEL_ID: string) {
  return useMemo(() => getRandomPrompt(MODEL_ID), [MODEL_ID]);
}

export { getRandomPrompt };
export default useRandomPrompt;
