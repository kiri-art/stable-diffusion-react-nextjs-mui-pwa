import { useRouter } from "next/router";
import React from "react";

import defaults from "./defaults";

function useSdState<T>(initialValue: T, type: "call" | "model" = "model") {
  const state = React.useState<T>(initialValue);
  return {
    value: state[0],
    setValue: state[1],
    type,
  };
}

export function modelStateValues(modelState: ModelState) {
  return Object.fromEntries(
    Object.entries(modelState).map(([key, { value }]) => [key, value])
  );
}

export function modelStateModelInputs(modelState: ModelState) {
  return Object.fromEntries(
    Object.entries(modelState)
      .filter(([_key, { type }]) => !type || type === "model")
      .map(([key, { value }]) => [key, value])
  );
}

export function modelStateCallInputs(modelState: ModelState) {
  return Object.fromEntries(
    Object.entries(modelState)
      .filter(([_key, { type }]) => type === "call")
      .map(([key, { value }]) => [key, value])
  );
}

//export type ModelState = ReturnType<typeof useModelState>;

type ValueSetValue<T> = {
  value: T;
  setValue: React.Dispatch<React.SetStateAction<T>>;
};

export interface ModelState {
  prompt: ValueSetValue<string>;
  negative_prompt: ValueSetValue<string>;
  num_inference_steps: ValueSetValue<string | number>;
  guidance_scale: ValueSetValue<string | number>;
  width: ValueSetValue<string | number>;
  height: ValueSetValue<string | number>;
  strength: ValueSetValue<string | number>;
  MODEL_ID: ValueSetValue<string>;
  PROVIDER_ID: ValueSetValue<string>;
  seed: ValueSetValue<string | number>;
  randomizeSeed: ValueSetValue<boolean>;
  shareInputs: ValueSetValue<boolean>;
  safety_checker: ValueSetValue<boolean>;
  sampler: ValueSetValue<string>;
  lora_weights: ValueSetValue<string[]>;
  textual_inversions: ValueSetValue<string[]>;
}

export default function useModelState(inputs?: string[]): ModelState {
  const router = useRouter();
  const query = router.query as {
    prompt?: string;
    negative_prompt?: string;
    num_inference_steps?: string;
    guidance_scale?: string;
    width?: string;
    height?: string;
    strength?: string;
    MODEL_ID?: string;
    PROVIDER_ID?: string;
    seed?: string;
    randomizeSeed?: string | boolean;
    shareInputs?: string | boolean;
    safety_checker?: string | boolean;
    sampler?: string;
    lora_weights?: string[];
    textual_inversions?: string[];
  };
  for (const v of ["randomizeSeed", "shareInputs", "safety_checker"] as const)
    if (query[v]) query[v] = query[v] === "true";

  const allStates = {
    prompt: useSdState(query.prompt || ""),
    negative_prompt: useSdState(query.negative_prompt || ""), // defaults.negative_prompt),
    num_inference_steps: useSdState<number | string>(
      query.num_inference_steps ?? defaults.num_inference_steps
    ),
    guidance_scale: useSdState<number | string>(
      query.guidance_scale ?? defaults.guidance_scale
    ),
    width: useSdState<number | string>(query.width ?? defaults.width),
    height: useSdState<number | string>(query.height ?? defaults.height),
    strength: useSdState<number | string>(query.strength ?? defaults.strength),
    MODEL_ID: useSdState<string>(query.MODEL_ID ?? defaults.MODEL_ID),
    PROVIDER_ID: useSdState<string>(query.PROVIDER_ID ?? defaults.PROVIDER_ID),
    seed: useSdState<number | string>(query.seed ?? defaults.seed()),
    randomizeSeed: useSdState<boolean>(
      (query.randomizeSeed as boolean) ?? defaults.randomizeSeed
    ),
    shareInputs: useSdState<boolean>(
      (query.shareInputs as boolean) ?? defaults.shareInputs
    ),
    safety_checker: useSdState<boolean>(
      (query.safety_checker as boolean) ?? defaults.safety_checker
    ),
    sampler: useSdState<string>(defaults.sampler),
    lora_weights: useSdState<string[]>([], "call"),
    textual_inversions: useSdState<string[]>([], "call"),
  };

  const ref = React.useRef(allStates);
  ref.current = allStates;

  React.useEffect(
    () => {
      console.log("query", query);
      for (const [key, value] of Object.entries(query)) {
        console.log(key, value);
        // @ts-expect-error: it's ok
        if (ref.current[key]) {
          // @ts-expect-error: it's ok
          ref.current[key].setValue(value);
        }
      }
    },
    // ok for now... this is a bit of a workaround
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ref, query]
  );

  // return allStates;

  return inputs
    ? (Object.fromEntries(
        Object.entries(allStates).filter(([key]) => inputs.includes(key))
      ) as unknown as ModelState) // TODO, clever typescript way to inspect inputs
    : allStates;
}
