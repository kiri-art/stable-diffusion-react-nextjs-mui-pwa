import { useMemo } from "react";

const randomPrompts = {
  "CompVis/stable-diffusion-v1-4": [
    "Super Dog",
    "A digital illustration of a medieval town, 4k, detailed, trending in artstation, fantasy",
    "Cute and adorable ferret wizard, wearing coat and suit, steampunk, lantern, anthromorphic, Jean paptiste monge, oil painting",
    "<Scene>, skylight, soft shadows, depth of field, canon, f 1.8, 35mm",
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
};
randomPrompts["hakurei/waifu-diffusion-v1-3-full"] =
  randomPrompts["hakurei/waifu-diffusion-v1-3"];

export default function useRandomPrompt(MODEL_ID: string) {
  return useMemo(() => {
    // @ts-expect-error: I don't have time for you, typescript
    const prompts = randomPrompts[MODEL_ID];
    return prompts[Math.floor(Math.random() * prompts.length)];
  }, [MODEL_ID]);
}
