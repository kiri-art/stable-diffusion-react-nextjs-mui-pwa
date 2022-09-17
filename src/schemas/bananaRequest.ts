import { object, date, string, InferType, boolean } from "yup";

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
  createdAt: date(),
  modelKey: string(),
  callID: string(),
  finished: boolean(),
  modelInputs: object(),
  steps: object({
    started: stepSchema.optional(),
    inference: stepSchema.optional(),
    finished: stepSchema.optional(),
  }),
});

type BananaRequest = InferType<typeof bananaRequestSchema>;

export type { BananaRequest };
export { bananaRequestSchema };
export default bananaRequestSchema;
