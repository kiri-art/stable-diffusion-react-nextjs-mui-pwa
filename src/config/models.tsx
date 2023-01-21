interface Model {
  MODEL_ID: string;
  description: string;
  notes?: JSX.Element;
  defaults?: Record<string, unknown>;
  randomPrompt?: string[] | { $ref: string };
  modelKeys?: {
    [key: string]: Record<string, unknown>;
  };
}

const models: Record<string, Model> = {
  "stabilityai/stable-diffusion-2-1-base": {
    MODEL_ID: "stabilityai/stable-diffusion-2-1-base",
    description: "Latest Stable Diffusion, Dec 6th. (512x512)",
  },
  "stabilityai/stable-diffusion-2-1": {
    MODEL_ID: "stabilityai/stable-diffusion-2-1",
    description: "Latest Stable Diffusion, Dec 6th. (768x768)",
  },
  "stabilityai/stable-diffusion-2-base": {
    MODEL_ID: "stabilityai/stable-diffusion-2-base",
    description: "Stable Diffusion from Nov 24th. (512x512)",
  },
  "stabilityai/stable-diffusion-2": {
    MODEL_ID: "stabilityai/stable-diffusion-2",
    description: "Stable Diffusion from Nov 24th. (768x768)",
  },
  "runwayml/stable-diffusion-v1-5": {
    MODEL_ID: "runwayml/stable-diffusion-v1-5",
    description: "Stable Diffusion from Oct 20th.",
  },
  "runwayml/stable-diffusion-inpainting": {
    MODEL_ID: "runwayml/stable-diffusion-inpainting",
    description: "Fine-tuned SD; Best for Inpainting.",
    notes: (
      <div style={{ color: "red" }}>
        {" "}
        Warning! Currently breaks easily on non-standard image sizes.
      </div>
    ),
  },
  "prompthero/openjourney-v2": {
    MODEL_ID: "prompthero/openjourney-v2",
    description: "SDv1.5 finetuned on Midjourney",
    notes: (
      <a href="https://huggingface.co/prompthero/openjourney-v2">
        Openjourney by PromptHero, Model Card
      </a>
    ),
  },
  "wd-1-4-anime_e1": {
    MODEL_ID: "wd-1-4-anime_e1",
    description: "Waifu Diffusion v1.4, Epoch 1, Dec 31",
    notes: (
      <a href="https://gist.github.com/harubaru/8581e780a1cf61352a739f2ec2eef09b">
        WD 1.4 Release Notes and Prompt Hints
      </a>
    ),
  },
  "hakurei/waifu-diffusion-v1-3": {
    MODEL_ID: "hakurei/waifu-diffusion-v1-3",
    description: "Best for Anime.  Final Release.  Oct 6",
    notes: (
      <a href="https://gist.github.com/harubaru/f727cedacae336d1f7877c4bbe2196e1">
        WD 1.3 Release Notes and Prompt Hints
      </a>
    ),
  },
  "Linaqruf/anything-v3.0": {
    MODEL_ID: "Linaqruf/anything-v3.0",
    description: "Anime Anything V3 (added Jan 2nd)",
    notes: (
      <a href="https://gist.github.com/harubaru/f727cedacae336d1f7877c4bbe2196e1">
        WD 1.3 Release Notes and Prompt Hints
      </a>
    ),
  },
  "CompVis/stable-diffusion-v1-4": {
    MODEL_ID: "CompVis/stable-diffusion-v1-4",
    description: "Original model, best for most cases.",
  },
  "hakurei/waifu-diffusion": {
    MODEL_ID: "hakurei/waifu-diffusion",
    description: "Anime.  Original, previous model (v1.2)",
  },
  "rinna/japanese-stable-diffusion": {
    MODEL_ID: "rinna/japanese-stable-diffusion",
    description: "Japanese / Japanglish prompt input, style",
  },
};

export default models;
