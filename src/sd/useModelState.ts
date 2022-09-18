import React from "react";

import defaults from "./defaults";

function useSdState<T>(initialValue: T) {
  const state = React.useState<T>(initialValue);
  return {
    value: state[0],
    setValue: state[1],
  };
}

export function modelStateValues(modelState: ModelState) {
  return Object.fromEntries(
    Object.entries(modelState).map(([key, { value }]) => [key, value])
  );
}

//export type ModelState = ReturnType<typeof useModelState>;

type ValueSetValue<T> = {
  value: T;
  setValue: React.Dispatch<React.SetStateAction<T>>;
};

export interface ModelState {
  prompt: ValueSetValue<string>;
  num_inference_steps: ValueSetValue<string | number>;
  guidance_scale: ValueSetValue<string | number>;
  width: ValueSetValue<string | number>;
  height: ValueSetValue<string | number>;
  strength: ValueSetValue<string | number>;
  MODEL_ID: ValueSetValue<string>;
  seed: ValueSetValue<string | number>;
  randomizeSeed: ValueSetValue<boolean>;
}

export default function useModelState(inputs?: string[]): ModelState {
  const allStates = {
    prompt: useSdState(""),
    num_inference_steps: useSdState<number | string>(
      defaults.num_inference_steps
    ),
    guidance_scale: useSdState<number | string>(defaults.guidance_scale),
    width: useSdState<number | string>(defaults.width),
    height: useSdState<number | string>(defaults.height),
    strength: useSdState<number | string>(defaults.strength),
    MODEL_ID: useSdState<string>(defaults.MODEL_ID),
    seed: useSdState<number | string>(defaults.seed),
    randomizeSeed: useSdState<boolean>(defaults.randomizeSeed),
  };

  // return allStates;

  return inputs
    ? (Object.fromEntries(
        Object.entries(allStates).filter(([key]) => inputs.includes(key))
      ) as unknown as ModelState) // TODO, clever typescript way to inspect inputs
    : allStates;
}
