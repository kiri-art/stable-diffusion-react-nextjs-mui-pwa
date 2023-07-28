function extractModelId(idOrUrl: string) {
  if (idOrUrl.match(/^\d+$/)) {
    return idOrUrl;
  } else if (idOrUrl.match("^https?://")) {
    const match = idOrUrl.match(/http?s:\/\/civitai.com\/models\/(\d+)\/?/);
    return match ? match[1] : null;
  }
  return null;
}

async function modelIdFromHash(hash: string) {
  const url = `https://civitai.com/api/v1/model-versions/by-hash/${hash}`;
  const response = await fetch(url);
  const data = (await response.json()) as ModelVersion;
  /*
  const text = await response.text();
  let data: ModelVersion | undefined;
  try {
    data = JSON.parse(text);
  } catch (error) {
    console.log(text);
    console.log(error);
    throw error;
  }
  */
  return data.modelId;
}

async function modelIdFromIdOrUrlOrHash(idOrUrlOrHash: string) {
  const lengths = [10, 64, 8, 64]; // AutoV2, SHA256, CRC32, BLAKE3
  for (const length of lengths)
    if (idOrUrlOrHash.match(new RegExp("^[0-9a-fA-F]{" + length + "}$")))
      return await modelIdFromHash(idOrUrlOrHash);

  return extractModelId(idOrUrlOrHash);
}

// https://github.com/civitai/civitai/wiki/REST-API-Reference
interface Model {
  [key: string]: unknown;
  id: number;
  name: string;
  description: string; // HTML
  type:
    | "Checkpoint"
    | "TextualInversion"
    | "Hypernetwork"
    | "AestheticGradient"
    | "LORA"
    | "Controlnet"
    | "Poses";
  poi: boolean;
  nsfw: boolean;
  tags: string[];
  mode?: "Archived" | "TakenDown";
  allowNoCredit: boolean;
  allowCommercialUse?: "None" | "Image" | "Rent" | "Sell";
  allowDerivatives: boolean;
  allowDifferentLicense: boolean;
  stats: {
    downloadCount: number;
    favoriteCount: number;
    commentCount: number;
    ratingCount: number;
    rating: number;
  };
  creator: {
    username: string;
    image: string;
  };
  modelVersions: ModelVersion[];
}

interface ModelVersionFileImage {
  url: string;
  nsfw: "None" | "Soft" | "Mature" | "X";
  width: number;
  height: number;
  hash: string;
  meta: null | {
    ENSD: string; // "31337"
    Size: string; // "512x768"
    seed: number;
    Model: string;
    steps: number;
    hashes: {
      model: string; // "c7751e6108"
    };
    prompt: string;
    Version: string; // "v1.3.2"
    sampler: string; // "DPM++ 2S a Karras"
    cfgScale: number; // 7
    resources: {
      hash: string; // "c7751e6108"
      name: string; // "Best_A-Zovya_RPG_Artist_Tools_V3"
      type: "model";
    }[];
    "Model hash": string; // "c7751e6108"
    "Hires upscale": string; // "2"
    "Hires upscaler": string; // "4x_foolhardy_Remacri"
    negativePrompt: string; // "((cleavage)) (monochrome) (disfigured) (grain) (poorly drawn) (mutilated) (lowres) (deformed) (dark) (lowpoly) (CG) (3d) (blurry) (duplicate) (watermark) (label) (signature) (frames) (text)"
    "Denoising strength": string; // "0.4"
  };
}

interface ModelVersion {
  id: number;
  modelId: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  trainedWords?: string[];
  baseModel: string;
  earlyAccessTimeFrame: number;
  description: string;
  vaeId?: null;
  // stats
  files: ModelVersionFile[];
  images: ModelVersionFileImage[];
}

interface ModelVersionWithModel extends ModelVersion {
  // not included as part of Model#ModelVersion
  model: {
    name: string;
    type:
      | "Checkpoint"
      | "TextualInversion"
      | "Hypernetwork"
      | "AestheticGradient"
      | "LORA"
      | "Controlnet"
      | "Poses";
    nsfw: boolean;
    poi: boolean;
  };
}

interface ModelVersionFile {
  id: number;
  url: string;
  sizeKb: number;
  name: string;
  type: "Model"; // WHAT ELSE?
  metaData: {
    fp?: "fp16" | "fp32";
    size?: "full" | "pruned";
    format?: "SafeTensor" | "PickleTensor" | "Other";
  };
  pickleScanResult: "Pending" | "Success" | "Danger" | "Error";
  pickleScanMessage?: string;
  virusScanResult: "Pending" | "Success" | "Danger" | "Error";
  virusScanMessage?: string;
  scannedAt?: Date;
  hashes: {
    AutoV2: string;
    SHA256: string;
    CRC32: string;
    BLAKE3: string;
  };
  downloadUrl: string;
  primary: boolean;
}

async function fetchModel(id: number | string): Promise<Model> {
  const modelId = typeof id === "number" ? id.toString() : id;
  const response = await fetch(`https://civitai.com/api/v1/models/${modelId}`);
  const data = await response.json();
  return data as Model;
}

export type {
  Model,
  ModelVersion,
  ModelVersionWithModel,
  ModelVersionFile,
  ModelVersionFileImage,
};
export { extractModelId, fetchModel, modelIdFromIdOrUrlOrHash };
