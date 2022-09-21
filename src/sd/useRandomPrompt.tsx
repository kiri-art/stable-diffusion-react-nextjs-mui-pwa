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

export default function useRandomPrompt(MODEL_ID: string) {
  return useMemo(() => {
    // @ts-expect-error: I don't have time for you, typescript
    const prompts = randomPrompts[MODEL_ID];
    return prompts[Math.floor(Math.random() * prompts.length)];
  }, [MODEL_ID]);
}
