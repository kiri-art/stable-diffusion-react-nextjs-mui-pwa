import { object, string, number, InferType } from "yup";

const creditCodeSchema = object({
  _id: string(),
  name: string().required(),
  credits: number().required(),
  total: number().required(),
  used: number().required().default(0),
});

type CreditCode = InferType<typeof creditCodeSchema>;

export type { CreditCode };
export { creditCodeSchema };
export default creditCodeSchema;
