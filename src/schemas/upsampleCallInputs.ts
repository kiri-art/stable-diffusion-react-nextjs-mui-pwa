import { object, string, InferType } from "yup";
import Providers from "../config/providers";

const upsampleCallInputsSchema = object({
  MODEL_ID: string().oneOf([
    "RealESRGAN_x4plus",
    "RealESRGAN_x4plus_anime_6B",
    "realesr-general-x4v3",
  ]),
  // .default("RealESRGAN_x4plus),
  PROVIDER_ID: string().oneOf(Providers.map((p) => p.id)),
  startRequestId: string(),
});

type UpsampleCallInputs = InferType<typeof upsampleCallInputsSchema>;

export type { UpsampleCallInputs };
export { upsampleCallInputsSchema };
export default upsampleCallInputsSchema;
