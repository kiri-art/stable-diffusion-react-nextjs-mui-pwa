interface ProviderGeneral {
  /**
   * id: the unique ID over this provider
   */
  id: string;
  label: string;
  api: "direct" | "banana" | "runpod";
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
  api: "banana" | "runpod";
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
    apiUrl: "https://api.banana.dev/",
  },
  {
    id: "kiri",
    label: "2",
    api: "banana",
    apiKey: process.env.KIRI_API_KEY as string, // TODO
    // apiUrl: "https://api-ams.kiri.art/",
    apiUrl: "http://localhost:5000",
  },
  {
    id: "kiri-local",
    label: "kiri-local",
    api: "banana",
    apiKey: process.env.KIRI_API_KEY as string, // TODO
    // apiUrl: "https://api-ams.kiri.art/",
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

export default Providers;

export const apiInfo = {
  direct: {
    serverless: false,
    startViaServer: false,
    checkViaServer: false,
  },
  banana: {
    serverless: true,
    startViaServer: true,
    checkViaServer: false,
  },
  runpod: {
    serverless: true,
    startViaServer: true,
    checkViaServer: true,
  },
};
