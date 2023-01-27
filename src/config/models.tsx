interface Model {
  MODEL_ID: string;
  MODEL_PRECISION?: "" | "fp16";
  MODEL_REVISION?: string;
  description: string;
  notes?: JSX.Element;
  defaults?: Record<string, unknown>;
  randomPrompts?: string[] | { $from: string };
  modelKeys?: {
    [key: string]: Record<string, unknown>;
  };
}

const models: Record<string, Model> = {
  "stabilityai/stable-diffusion-2-1-base": {
    MODEL_ID: "stabilityai/stable-diffusion-2-1-base",
    description: "Latest Stable Diffusion, Dec 6th. (512x512)",
    randomPrompts: { $from: "CompVis/stable-diffusion-v1-4" },
  },
  "stabilityai/stable-diffusion-2-1": {
    MODEL_ID: "stabilityai/stable-diffusion-2-1",
    description: "Latest Stable Diffusion, Dec 6th. (768x768)",
    randomPrompts: { $from: "CompVis/stable-diffusion-v1-4" },
  },
  "stabilityai/stable-diffusion-2-base": {
    MODEL_ID: "stabilityai/stable-diffusion-2-base",
    description: "Stable Diffusion from Nov 24th. (512x512)",
    randomPrompts: { $from: "CompVis/stable-diffusion-v1-4" },
  },
  "stabilityai/stable-diffusion-2": {
    MODEL_ID: "stabilityai/stable-diffusion-2",
    description: "Stable Diffusion from Nov 24th. (768x768)",
    randomPrompts: { $from: "CompVis/stable-diffusion-v1-4" },
  },
  "runwayml/stable-diffusion-v1-5": {
    MODEL_ID: "runwayml/stable-diffusion-v1-5",
    description: "Stable Diffusion from Oct 20th.",
    randomPrompts: { $from: "CompVis/stable-diffusion-v1-4" },
  },
  "runwayml/stable-diffusion-inpainting": {
    MODEL_ID: "runwayml/stable-diffusion-inpainting",
    description: "Fine-tuned SD; Best for Inpainting.",
    randomPrompts: { $from: "CompVis/stable-diffusion-v1-4" },
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
    randomPrompts: [
      "retro serie of different cars with different colors and shapes",
    ],
    notes: (
      <a href="https://huggingface.co/prompthero/openjourney-v2">
        Openjourney by PromptHero, Model Card
      </a>
    ),
  },
  "wd-1-4-anime_e1": {
    MODEL_ID: "wd-1-4-anime_e1",
    description: "Waifu Diffusion v1.4, Epoch 1, Dec 31",
    randomPrompts: [
      "masterpiece, best quality, 1girl, black eyes, black hair, black sweater, blue background, bob cut, closed mouth, glasses, medium hair, red-framed eyewear, simple background, solo, sweater, upper body, wide-eyed",
      "masterpiece, best quality, 1girl, aqua eyes, baseball cap, blonde hair, closed mouth, earrings, green background, hat, hoop earrings, jewelry, looking at viewer, shirt, short hair, simple background, solo, upper body, yellow shirt",
      "masterpiece, best quality, 1girl, black bra, black hair, black panties, blush, borrowed character, bra, breasts, cleavage, closed mouth, gradient hair, hair bun, heart, large breasts, lips, looking at viewer, multicolored hair, navel, panties, pointy ears, red hair, short hair, sweat, underwear",
      "masterpiece, best quality, high quality, yakumo ran, touhou, 1girl, :d, animal ears, blonde hair, breasts, cowboy shot, extra ears, fox ears, fox shadow puppet, fox tail, head tilt, large breasts, looking at viewer, multiple tails, no headwear, short hair, simple background, smile, solo, tabard, tail, white background, yellow eyes",
      "masterpiece, best quality, high quality, scenery, japanese shrine, no humans, absurdres",
    ],
    notes: (
      <a href="https://gist.github.com/harubaru/8581e780a1cf61352a739f2ec2eef09b">
        WD 1.4 Release Notes and Prompt Hints
      </a>
    ),
  },
  "hakurei/waifu-diffusion-v1-3": {
    MODEL_ID: "hakurei/waifu-diffusion-v1-3",
    description: "Best for Anime.  Final Release.  Oct 6",
    randomPrompts: [
      "1girl, witch, purple hair, facing the viewer, night sky, big moon, highly detailed",
      "chen, arknights, 1girl, animal ears, brown hair, cat ears, cat tail, closed mouth, earrings, face, hat, jewelry, lips, multiple tails, nekomata, painterly, red eyes, short hair, simple background, solo, tail, white background",
      "yakumo ran, arknights, 1girl, :d, animal ears, blonde hair, breasts, cowboy shot, extra ears, fox ears, fox shadow puppet, fox tail, head tilt, large breasts, looking at viewer, multiple tails, no headwear, short hair, simple background, smile, solo, tabard, tail, white background, yellow eyes",
    ],
    notes: (
      <a href="https://gist.github.com/harubaru/f727cedacae336d1f7877c4bbe2196e1">
        WD 1.3 Release Notes and Prompt Hints
      </a>
    ),
  },
  "Linaqruf/anything-v3.0": {
    MODEL_ID: "Linaqruf/anything-v3.0",
    description: "Anime Anything V3 (added Jan 2nd)",
    randomPrompts: [
      "1girl, brown hair, green eyes, colorful, autumn, cumulonimbus clouds, lighting, blue sky, falling leaves, garden",
      "1boy, medium hair, blonde hair, blue eyes, bishounen, colorful, autumn, cumulonimbus clouds, lighting, blue sky, falling leaves, garden",
      "scenery, shibuya tokyo, post-apocalypse, ruins, rust, sky, skyscraper, abandoned, blue sky, broken window, building, cloud, crane machine, outdoors, overgrown, pillar, sunset",
    ],
    notes: (
      <a href="https://gist.github.com/harubaru/f727cedacae336d1f7877c4bbe2196e1">
        WD 1.3 Release Notes and Prompt Hints
      </a>
    ),
  },
  "CompVis/stable-diffusion-v1-4": {
    MODEL_ID: "CompVis/stable-diffusion-v1-4",
    description: "Original model, best for most cases.",
    randomPrompts: [
      "Super Dog",
      "A digital illustration of a medieval town, 4k, detailed, trending in artstation, fantasy",
      "Cute and adorable ferret wizard, wearing coat and suit, steampunk, lantern, anthromorphic, Jean paptiste monge, oil painting",
      "<Scene>, skylight, soft shadows, depth of field, canon, f 1.8, 35mm",
    ],
  },
  "hakurei/waifu-diffusion": {
    MODEL_ID: "hakurei/waifu-diffusion",
    description: "Anime.  Original, previous model (v1.2)",
    randomPrompts: [
      "touhou hakurei_reimu 1girl solo portrait",
      // @leemengtaiwan
      // https://www.reddit.com/r/StableDiffusion/comments/x8un2h/testing_waifu_diffusion_see_prompt_comparison/
      "a portrait of a charming girl with a perfect face and long hair and tattoo on her cheek and cyberpunk headset, anime, captivating, aesthetic, hyper-detailed and intricate, realistic shaded, realistic proportion, symmetrical, concept art, full resolution, golden ratio, global resolution",
    ],
  },
  "rinna/japanese-stable-diffusion": {
    MODEL_ID: "rinna/japanese-stable-diffusion",
    description: "Japanese / Japanglish prompt input, style",
    randomPrompts: [
      // https://prtimes.jp/main/html/rd/p/000000035.000070041.html
      "サラリーマン 油絵",
      "夕暮れの神社の夏祭りを描いた水彩画",
      "ハンバーガー　浮世絵",
      "キラキラ瞳の猫",
      "宇宙の月でバイクで走るライダー",
      "かわいいわんこのイラスト",
    ],
  },
  "OrangeMix/AbyssOrangeMix2": {
    MODEL_ID: "OrangeMix/AbyssOrangeMix2",
    MODEL_PRECISION: "fp16",
    MODEL_REVISION: "",
    description: "Anime.  Highly detailed, realistic illustrations.",
    randomPrompts: [
      "(masterpiece:1,2), best quality, masterpiece, highres, original, extremely detailed wallpaper, looking at viewer, (sitting:1.4), (A robotic girl stands in the center holding a bouquet of orange flowers.:1.4).,(1humanoid cyborg girl:1.0), (happy, closed eye smile:1.6), (mechanical hand:1.05), [[cyborg]], metallic mixture, drawing, paintbrush, beret, (glowing_eyes:0.95), (separate sleeves), silver long_hair, hair_between_eyes, sigma 135mm lens, (Lots of oldman male researchers in white coats standing aside:1.2), 👨‍💻👨‍🔬,(cowboy shot:1.2), upper body,perfect lighting,(extremely detailed CG:1.2),(8k:1.1},(happy:1.3), :d, group of male researchers surrounding a female-shaped AI cyborg, smiling and laughing. cyborg cute girl sitting in the center of the group of male human researchers.The human male researchers are all smiling and laughing, (Group photo, commemorative photo, :1.4)",
    ],
    notes: (
      <a href="https://huggingface.co/WarriorMama777/OrangeMixs#abyssorangemix2-aom2">
        AbyssOrangeMix2 (AOM2) notes
      </a>
    ),
  },
  "OrangeMix/ElyOrangeMix": {
    MODEL_ID: "OrangeMix/ElyOrangeMix",
    MODEL_PRECISION: "fp16",
    MODEL_REVISION: "",
    description: "Improves Elysium_AnimeV2; 3d thick paint style.",
    notes: (
      <a href="https://huggingface.co/WarriorMama777/OrangeMixs#elyorangemix-elom">
        ElyOrangeMix (ELOM) notes
      </a>
    ),
  },
  "OrangeMix/EerieOrangeMix": {
    MODEL_ID: "OrangeMix/EerieOrangeMix",
    MODEL_PRECISION: "fp16",
    MODEL_REVISION: "",
    description: "Improves Elysium_AnimeV2",
    randomPrompts: [
      "((masterpiece)), best quality, perfect anatomy, (1girl, solo focus:1.4), pov, looking at viewer, flower trim,(perspective, sideway, From directly above ,lying on water, open hand, palm, :1.3),(Accurate five-fingered hands, Reach out, hand focus, foot focus, Sole, heel, ball of the thumb:1.2), (outdoor, sunlight:1.2),(shiny skin:1.3),,(masterpiece, white border, outside border, frame:1.3), (motherhood, aged up, mature female, medium breasts:1.2), (curvy:1.1), (single side braid:1.2), (long hair with queue and braid, disheveled hair, hair scrunchie, tareme:1.2), (light Ivory hair:1.2), looking at viewer, Calm, Slight smile, (anemic, dark, lake, river,puddle, Meadow, rock, stone, moss, cliff, white flower, stalactite, Godray, ruins, ancient, eternal, deep ,mystic background,sunlight,plant,lily,white flowers, Abyss, :1.2), (orange fruits, citrus fruit, citrus fruit bearing tree:1.4), volumetric lighting,good lighting,, masterpiece, best quality, highly detailed,extremely detailed cg unity 8k wallpaper,illustration,((beautiful detailed face)), best quality, (((hyper-detailed ))), high resolution illustration ,high quality, highres, sidelighting, ((illustrationbest)),highres,illustration, absurdres, hyper-detailed, intricate detail, perfect, high detailed eyes,perfect lighting, (extremely detailed CG:1.2)",
      "street, 130mm f1.4 lens, ,(shiny skin:1.3),, (teen age, school uniform:1.2), (glasses, black hair, medium hair with queue and braid, disheveled hair, hair scrunchie, tareme:1.2), looking at viewer,, Calm, Slight smile",
    ],
    notes: (
      <a href="https://huggingface.co/WarriorMama777/OrangeMixs#eerieorangemix-eom">
        EerieOrangeMix (EOM) notes
      </a>
    ),
  },
  "OrangeMix/BloodOrangeMix": {
    MODEL_ID: "OrangeMix/BloodOrangeMix",
    MODEL_PRECISION: "fp16",
    MODEL_REVISION: "",
    description: "Improves AnythingV3, paint style, popular in JP.",
    notes: (
      <a href="https://huggingface.co/WarriorMama777/OrangeMixs#bloodorangemix-bom">
        BloodOrangeMix (BOM)
      </a>
    ),
  },
};

export default models;
