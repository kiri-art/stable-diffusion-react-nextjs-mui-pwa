import { object, string, boolean, InferType } from "yup";

const upsampleModelInputsSchema = object({
  input_image: string(),
  face_enhance: boolean(),
});

type UpsampleModelInputs = InferType<typeof upsampleModelInputsSchema>;

export type { UpsampleModelInputs };
export { upsampleModelInputsSchema };
export default upsampleModelInputsSchema;
