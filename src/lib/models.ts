import ddaCallInputsSchema, { ddaCallInputs } from "../schemas/ddaCallInputs";
import ddaModelInputsSchema, {
  ddaModelInputs,
} from "../schemas/ddaModelInputs";
import upsampleCallInputsSchema from "../schemas/upsampleCallInputs";
import upsampleModelInputsSchema from "../schemas/upsampleModelInputs";

export interface Model {
  id: string;
  callInputsSchema?:
    | typeof ddaCallInputsSchema
    | typeof upsampleCallInputsSchema;
  modelInputsSchema?:
    | typeof ddaModelInputsSchema
    | typeof upsampleModelInputsSchema;
  prepareInputs?: (
    callInputs: ddaCallInputs,
    modelInputs: ddaModelInputs
  ) => void;
}

const models: Record<string, Model> = {
  dda: {
    id: "dda",
    callInputsSchema: ddaCallInputsSchema,
    modelInputsSchema: ddaModelInputsSchema,
    prepareInputs(callInputs: ddaCallInputs, modelInputs: ddaModelInputs) {
      // TODO need to fix this in Controlers
      // @ts-expect-error: doesn't exist, need to fix as above
      delete modelInputs.randomizeSeed;
      // @ts-expect-error: doesn't exist, need to fix as above
      delete modelInputs.shareInputs;

      // @ts-expect-error: doesn't exist, need to fix as above
      callInputs.safety_checker = modelInputs.safety_checker;
      // @ts-expect-error: doesn't exist, need to fix as above
      delete modelInputs.safety_checker;

      if (typeof modelInputs.MODEL_ID === "string") {
        callInputs.MODEL_ID = modelInputs.MODEL_ID;
        delete modelInputs.MODEL_ID;
      }

      if (modelInputs.PROVIDER_ID) {
        // @ts-expect-error: TODO XXX was no error here before refactor
        callInputs.PROVIDER_ID = modelInputs.PROVIDER_ID;
        delete modelInputs.PROVIDER_ID;
      }

      delete modelInputs.sampler;

      callInputs.MODEL_URL = "s3://";
    },
  },
  upsample: {
    id: "upsample",
    callInputsSchema: upsampleCallInputsSchema,
    modelInputsSchema: upsampleModelInputsSchema,
  },
};

function getModel(modelId: string) {
  const model = models[modelId];
  if (!model) throw new Error("No model with id: " + modelId);
  return model;
}

export { getModel };
export default models;
