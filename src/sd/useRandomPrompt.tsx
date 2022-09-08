import { useMemo } from "react";

const randomPrompts = [
  "Super Dog",
  "A digital illustration of a medieval town, 4k, detailed, trending in artstation, fantasy",
  "Cute and adorable ferret wizard, wearing coat and suit, steampunk, lantern, anthromorphic, Jean paptiste monge, oil painting",
  "<Scene>, skylight, soft shadows, depth of field, canon, f 1.8, 35mm",
];

export default function useRandomPrompt() {
  return useMemo(() => {
    // Do at runtime to get in local language
    return randomPrompts[Math.floor(Math.random() * randomPrompts.length)];
  }, []);
}
