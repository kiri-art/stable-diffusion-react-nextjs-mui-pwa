import type { ddaCallInputs } from "./ddaCallInputs";
import type { ddaModelInputs } from "./ddaModelInputs";

export default interface Star {
  [key: string]: unknown;
  _id: string; // or ObjectID todo
  userId: string; // or ObjectID todo
  date: Date;
  callInputs: ddaCallInputs;
  modelInputs: ddaModelInputs;
  files: {
    output: string;
    init?: string;
    mask?: string;
  };
  // stars: number;
  // starredBy: string[];
  likes: number;
}
