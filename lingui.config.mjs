import { formatter } from "@lingui/format-po";

export default {
  locales: ["en-US", "he-IL", "ja-JP", "fa-IR"],
  // pseudoLocale: "pseudo",
  sourceLocale: "en-US",
  fallbackLocales: {
    default: "en-US",
  },
  catalogs: [
    {
      path: "locales/{locale}/messages",
      include: ["pages", "src"],
    },
  ],
  format: formatter(),
};
