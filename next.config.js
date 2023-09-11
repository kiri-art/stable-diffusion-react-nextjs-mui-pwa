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
  experimental: {
    swcPlugins: [
      [
        "@lingui/swc-plugin",
        {
          // the same options as in .swcrc
        },
      ],
    ],
  },
  webpack: (config) => {
    if (process.env.NODE_ENV === "development") {
      config.resolve.alias = {
        ...config.resolve.alias,
        "next-auth/react": require.resolve("next-auth/react"),
      };
    }
    return config;
  },
  /*
  async headers() {
    return [
      {
        source: "/:path*{/}?",
        headers: [
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
  */
});
