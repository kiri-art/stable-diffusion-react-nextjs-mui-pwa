// eslint-disable-next-line @typescript-eslint/no-var-requires
const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  skipWaiting: false,
});

/** @type {import('next').NextConfig} */
module.exports = withPWA({
  reactStrictMode: true,
  i18n: {
    locales: ["en-US", "he-IL", "ja-JP", "fa-IR"],
    defaultLocale: "en-US",
    // domains: [ { domain: "example.com", defaultLocale: 'en-US '} ]
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
        pathname: "/api/file",
      },
      {
        protocol: "https",
        hostname: "kiri.art",
        // port: "443",
        pathname: "/api/file",
      },
    ],
  },
});
