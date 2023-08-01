import ddaCallInputsSchema, { ddaCallInputs } from "../schemas/ddaCallInputs";
import ddaModelInputsSchema, {
  ddaModelInputs,
} from "../schemas/ddaModelInputs";
import upsampleCallInputsSchema from "../schemas/upsampleCallInputs";
import upsampleModelInputsSchema from "../schemas/upsampleModelInputs";
import SubModels from "../config/models";
import InvokeAIPromptResolver from "../sd/converter_standalone";

const invokeaiResolver = new InvokeAIPromptResolver();

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

      // @ts-expect-error: TODO
      if (callInputs.MODEL_ID && !callInputs.use_extra) {
        const subModel = SubModels[callInputs.MODEL_ID];
        callInputs.MODEL_PRECISION = subModel.MODEL_PRECISION ?? "fp16";
        callInputs.MODEL_REVISION = subModel.MODEL_REVISION ?? "fp16";
        callInputs.MODEL_URL = subModel.MODEL_URL ?? "s3://";
        if (subModel.CHECKPOINT_URL)
          callInputs.CHECKPOINT_URL = subModel.CHECKPOINT_URL;
        if (subModel.safety_checker === false)
          callInputs.safety_checker = false;
        callInputs.compel_prompts = true;

        const result = invokeaiResolver.convertAuto1111ToInvokeAI(
          modelInputs.prompt,
          modelInputs.negative_prompt
        );
        console.log(result);
        modelInputs.prompt = result.to.positive.text;
        modelInputs.negative_prompt = result.to.negative.text;
      }
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
