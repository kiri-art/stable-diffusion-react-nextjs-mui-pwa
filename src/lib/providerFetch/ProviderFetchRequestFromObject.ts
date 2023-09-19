import ProviderFetchRequestBase, {
  ProviderFetchRequestObject,
} from "./ProviderFetchRequestBase";
import ProviderFetchRequestBanana from "./ProviderFetchRequestBanana";
import providers from "../../config/providers";
import { getModel } from "../models";

const ProviderFetchRequestByApi = {
  direct: ProviderFetchRequestBase,
  banana: ProviderFetchRequestBanana,
  runpod: ProviderFetchRequestBase, // TODO
  "banana+kiri": ProviderFetchRequestBanana,
};

export default function ProviderFetchRequestFromObject(
  object: ProviderFetchRequestObject,
  createId = false
) {
  const id = createId ? undefined : object.id;
  if (!(id || createId))
    throw new Error("fromObject(obj) but `obj` has no `id` field");

  const provider = providers.find((p) => p.id === object.providerId);
  if (!provider) throw new Error("Invalid providerId: " + object.providerId);

  const model = getModel(object.modelId);

  const ProviderFetchRequest = ProviderFetchRequestByApi[provider.api];
  if (!ProviderFetchRequest) throw new Error("Invalid API: " + provider.api);

  const providerFetchRequest = new ProviderFetchRequest(
    provider,
    model,
    object.inputs,
    id
  );

  providerFetchRequest.callID = object.callID || "";
  providerFetchRequest.finished = object.finished || false;
  providerFetchRequest.message = object.message || "";

  return providerFetchRequest;
}
