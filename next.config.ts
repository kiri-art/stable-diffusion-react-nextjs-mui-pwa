import type { NextConfig } from "next";
import {
  PHASE_DEVELOPMENT_SERVER,
  PHASE_PRODUCTION_BUILD,
} from "next/constants";

export default async function (phase: string): Promise<NextConfig> {
  const nextConfig: NextConfig = {
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
            "runtimeModules": {
              "i18n": ["@lingui/core", "i18n"],
              "trans": ["@lingui/react", "Trans"],
            },
          },
        ],
      ],
    },
    /*
    Disabled on Next 16 upgrade, in case it all works, lets see.
    webpack: (config) => {
      config.module.rules.push({
        test: /\..*ignore/,
        use: [
          {
            loader: "ignore-loader",
          },
        ],
      });

      if (process.env.NODE_ENV === "development") {
        config.resolve.alias = {
          ...config.resolve.alias,
          "next-auth/react": require.resolve("next-auth/react"),
        };
      }
      return config;
    },
    */
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
  };

  if (phase === PHASE_DEVELOPMENT_SERVER || phase === PHASE_PRODUCTION_BUILD) {
    const withSerwist = (await import("@serwist/next")).default({
      // https://serwist.pages.dev/docs/next/configuring/cache-on-navigation
      cacheOnNavigation: true,

      // Note: This is only an example. If you use Pages Router,
      // use something else that works, such as "service-worker/index.ts".
      swSrc: "src/app/sw.ts",
      swDest: "public/sw.js",

      //   reloadOnOnline: true,

      disable: process.env.NODE_ENV === "development", // to disable pwa in development

      // https://serwist.pages.dev/docs/next/configuring/reload-on-online
      // Hopefully fixes issue where app reloads after phone lock/unlock on Android Chrome.
      reloadOnOnline: false,

      // Handled in src/serwistStuff.tsx
      // https://serwist.pages.dev/docs/next/configuring/register
      register: false,
    });
    return withSerwist(nextConfig);
  }

  return nextConfig;
}
