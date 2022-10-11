import { object, string, InferType, date, mixed } from "yup";
import bananaRequestSchema from "./bananaRequest";

const historyItemSchema = object({
  _id: string(),
  date: date(),
  callInputs: bananaRequestSchema.fields["callInputs"],
  modelInputs: bananaRequestSchema.fields["modelInputs"],
  result: mixed(),
}).concat(bananaRequestSchema.pick(["callInputs", "modelInputs"]));

type HistoryItem = InferType<typeof historyItemSchema>;

export type { HistoryItem };
export { historyItemSchema };
export default historyItemSchema;
