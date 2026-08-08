import { object, date, string, InferType, boolean, number, mixed } from "yup";
import type { ddaCallInputs } from "./ddaCallInputs";
import type { ddaModelInputs } from "./ddaModelInputs";
import type { UpsampleModelInputs } from "./upsampleModelInputs";
import type { UpsampleCallInputs } from "./upsampleCallInputs";

const stepSchema = object({
  // name: string(),
  date: date(),
  value: object().optional(),
});

const bananaRequestSchema = object({
  _id: string(),
  bananaId: string(),
  message: string(),
  apiVersion: string(),
  createdAt: date().required(),
  modelKey: string(),
  startRequestId: string(),
  callID: string(),
  finished: boolean(),
  modelInputs: mixed<ddaModelInputs | UpsampleModelInputs>().defined(),
  callInputs: mixed<ddaCallInputs | UpsampleCallInputs>().defined(),
  steps: object({
    started: stepSchema.optional(),
    inference: stepSchema.optional(),
    finished: stepSchema.optional(),
  }),
  times: object({
    load: number(),
    init: number(),
    inference: number(),
  }).optional(),
  finishedTime: date(),
  totalTime: number(),
  credits: number(),
  paid: boolean(),
});

type BananaRequest = InferType<typeof bananaRequestSchema>;

export type { BananaRequest };
export { bananaRequestSchema };
export default bananaRequestSchema;
