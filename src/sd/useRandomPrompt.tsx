import { useMemo } from "react";

const _randomPrompts = {
  "CompVis/stable-diffusion-v1-4": [
    "Super Dog",
    "A digital illustration of a medieval town, 4k, detailed, trending in artstation, fantasy",
    "Cute and adorable ferret wizard, wearing coat and suit, steampunk, lantern, anthromorphic, Jean paptiste monge, oil painting",
    "<Scene>, skylight, soft shadows, depth of field, canon, f 1.8, 35mm",
  ],
  "wd-1-4-anime_e1": [
    "masterpiece, best quality, 1girl, black eyes, black hair, black sweater, blue background, bob cut, closed mouth, glasses, medium hair, red-framed eyewear, simple background, solo, sweater, upper body, wide-eyed",
    "masterpiece, best quality, 1girl, aqua eyes, baseball cap, blonde hair, closed mouth, earrings, green background, hat, hoop earrings, jewelry, looking at viewer, shirt, short hair, simple background, solo, upper body, yellow shirt",
    "masterpiece, best quality, 1girl, black bra, black hair, black panties, blush, borrowed character, bra, breasts, cleavage, closed mouth, gradient hair, hair bun, heart, large breasts, lips, looking at viewer, multicolored hair, navel, panties, pointy ears, red hair, short hair, sweat, underwear",
    "masterpiece, best quality, high quality, yakumo ran, touhou, 1girl, :d, animal ears, blonde hair, breasts, cowboy shot, extra ears, fox ears, fox shadow puppet, fox tail, head tilt, large breasts, looking at viewer, multiple tails, no headwear, short hair, simple background, smile, solo, tabard, tail, white background, yellow eyes",
    "masterpiece, best quality, high quality, scenery, japanese shrine, no humans, absurdres",
  ],
  "hakurei/waifu-diffusion": [
    "touhou hakurei_reimu 1girl solo portrait",
    // @leemengtaiwan
    // https://www.reddit.com/r/StableDiffusion/comments/x8un2h/testing_waifu_diffusion_see_prompt_comparison/
    "a portrait of a charming girl with a perfect face and long hair and tattoo on her cheek and cyberpunk headset, anime, captivating, aesthetic, hyper-detailed and intricate, realistic shaded, realistic proportion, symmetrical, concept art, full resolution, golden ratio, global resolution",
  ],
  "hakurei/waifu-diffusion-v1-3": [
    "1girl, witch, purple hair, facing the viewer, night sky, big moon, highly detailed",
    "chen, arknights, 1girl, animal ears, brown hair, cat ears, cat tail, closed mouth, earrings, face, hat, jewelry, lips, multiple tails, nekomata, painterly, red eyes, short hair, simple background, solo, tail, white background",
    "yakumo ran, arknights, 1girl, :d, animal ears, blonde hair, breasts, cowboy shot, extra ears, fox ears, fox shadow puppet, fox tail, head tilt, large breasts, looking at viewer, multiple tails, no headwear, short hair, simple background, smile, solo, tabard, tail, white background, yellow eyes",
  ],
  "hakurei/waifu-diffusion-v1-3-full": ["..."],
  "rinna/japanese-stable-diffusion": [
    // https://prtimes.jp/main/html/rd/p/000000035.000070041.html
    "サラリーマン 油絵",
    "夕暮れの神社の夏祭りを描いた水彩画",
    "ハンバーガー　浮世絵",
    "キラキラ瞳の猫",
    "宇宙の月でバイクで走るライダー",
    "かわいいわんこのイラスト",
  ],
  "Linaqruf/anything-v3.0": [
    "1girl, brown hair, green eyes, colorful, autumn, cumulonimbus clouds, lighting, blue sky, falling leaves, garden",
    "1boy, medium hair, blonde hair, blue eyes, bishounen, colorful, autumn, cumulonimbus clouds, lighting, blue sky, falling leaves, garden",
    "scenery, shibuya tokyo, post-apocalypse, ruins, rust, sky, skyscraper, abandoned, blue sky, broken window, building, cloud, crane machine, outdoors, overgrown, pillar, sunset",
  ],
};

const randomPrompts = {
  ..._randomPrompts,
  "stabilityai/stable-diffusion-2-1":
    _randomPrompts["CompVis/stable-diffusion-v1-4"],
  "stabilityai/stable-diffusion-2-1-base":
    _randomPrompts["CompVis/stable-diffusion-v1-4"],
  "stabilityai/stable-diffusion-2":
    _randomPrompts["CompVis/stable-diffusion-v1-4"],
  "stabilityai/stable-diffusion-2-base":
    _randomPrompts["CompVis/stable-diffusion-v1-4"],
  "hakurei/waifu-diffusion-v1-3-full":
    _randomPrompts["hakurei/waifu-diffusion-v1-3"],
  "runwayml/stable-diffusion-v1-5":
    _randomPrompts["CompVis/stable-diffusion-v1-4"],
  "runwayml/stable-diffusion-inpainting":
    _randomPrompts["CompVis/stable-diffusion-v1-4"],
};

function getRandomPrompt(MODEL_ID: string) {
  // @ts-expect-error: I don't have time for you, typescript
  const prompts = randomPrompts[MODEL_ID];
  return prompts[Math.floor(Math.random() * prompts.length)];
}

function useRandomPrompt(MODEL_ID: string) {
  return useMemo(() => getRandomPrompt(MODEL_ID), [MODEL_ID]);
}

export { randomPrompts, getRandomPrompt };
export default useRandomPrompt;
