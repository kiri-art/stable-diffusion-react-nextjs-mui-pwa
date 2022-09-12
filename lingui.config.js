module.exports = {
  locales: ["en-US", "he-IL", "ja-JP"],
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
  format: "po",
};
