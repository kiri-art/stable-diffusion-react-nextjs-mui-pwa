interface ProviderGeneral {
  /**
   * id: the unique ID over this provider
   */
  id: string;
  label: string;
  api: "direct" | "banana" | "banana+kiri" | "runpod";
  apiKey: string;
  /**
   * apiUrl: override default API_URL for this api type
   */
  apiUrl?: string; // override
  /**
   * Default: `{API}_MODEL_KEY`, e.g. `BANANA_MODEL_KEY`.
   * Unless overriden, final key is `${modelKeyBase}_${MODEL_ID}`.
   */
  modelKeyBase?: string;
  /**
   * tags: freeform tags that can be used elsewhere to
   * e.g. filter providers.
   */
  tags?: string[];
}

export interface ProviderDirect extends Omit<ProviderGeneral, "apiKey"> {
  api: "direct";
}

export interface ProviderServerless extends ProviderGeneral {
  api: "banana" | "runpod" | "banana+kiri";
}

export type Provider = ProviderDirect | ProviderServerless;

const Providers: Provider[] = [
  {
    id: "0",
    label: "local",
    api: "direct",
    apiUrl: "http://localhost:8000/",
  },
  {
    id: "banana",
    label: "1",
    api: "banana",
    apiKey: process.env.BANANA_API_KEY as string, // TODO
    apiUrl: "https://api.banana.dev",
  },
  {
    id: "kiri",
    label: "2",
    api: "banana+kiri",
    apiKey: process.env.KIRI_API_KEY as string, // TODO
    apiUrl: "https://api-ams.kiri.art",
  },
  {
    id: "kiri-local",
    label: "kiri-local",
    api: "banana+kiri",
    apiKey: process.env.KIRI_API_KEY as string, // TODO
    apiUrl: "http://localhost:5000",
  },
  {
    id: "runpod",
    label: "3",
    api: "runpod",
    apiKey: process.env.RUNPOD_API_KEY as string, // TODO
    apiUrl: "https://api.runpod.ai/v1/",
  },
];

if (process.env.NODE_ENV === "production") {
  Providers.splice(0, 1); // direct
  Providers.splice(2, 2); // kiri-local + runpod
}

export default Providers;

export const apiInfo = {
  direct: {
    oneshot: true,
    startViaServer: false,
    checkViaServer: false,
    streamable: true,
  },
  banana: {
    oneshot: false,
    startViaServer: true,
    checkViaServer: false,
    streamable: false,
  },
  "banana+kiri": {
    oneshot: false,
    startViaServer: true,
    checkViaServer: false,
    streamable: true,
  },
  runpod: {
    oneshot: false,
    startViaServer: true,
    checkViaServer: true,
    streamable: false,
  },
};
