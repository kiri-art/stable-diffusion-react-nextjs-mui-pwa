import { object, string, InferType } from "yup";

const txt2imgOptsSchema = object({
  prompt: string(),
});

type Txt2ImgOpts = InferType<typeof txt2imgOptsSchema>;

export type { Txt2ImgOpts };
export { txt2imgOptsSchema };
export default txt2imgOptsSchema;
