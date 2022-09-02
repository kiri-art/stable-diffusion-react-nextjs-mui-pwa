// eslint-disable-next-line @typescript-eslint/no-var-requires
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
module.exports = withPWA({
  reactStrictMode: true,
  i18n: {
    locales: ["en-US", "he-IL"],
    defaultLocale: "en-US",
    // domains: [ { domain: "example.com", defaultLocale: 'en-US '} ]
  },
});
