import type { StableDiffusionInputs } from "./stableDiffusionInputs";
import type { BananaCallInputs } from "./bananaCallInputs";

export default interface Star {
  [key: string]: unknown;
  _id: string; // or ObjectID todo
  userId: string; // or ObjectID todo
  date: Date;
  callInputs: BananaCallInputs;
  modelInputs: StableDiffusionInputs;
  files: {
    output: string;
    init?: string;
    mask?: string;
  };
  // stars: number;
  // starredBy: string[];
  likes: number;
}
