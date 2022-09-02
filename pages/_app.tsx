import * as React from "react";
import Head from "next/head";
import { AppProps } from "next/app";
import { useRouter } from "next/router";

import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { CacheProvider, EmotionCache } from "@emotion/react";

import themes from "../src/theme";
import createEmotionCache from "../src/createEmotionCache";
import locales, { defaultLocale } from "../src/lib/locales";
import { i18n, I18nProvider } from "../src/lib/i18n";

interface MyAppProps extends AppProps {
  emotionCache?: EmotionCache;
}

// Client-side caches, shared for the whole session of the user in the browser.
const csEmotionCache = {
  ltr: createEmotionCache("ltr"),
  rtl: createEmotionCache("rtl"),
};

export default function MyApp(props: MyAppProps) {
  const router = useRouter();
  const locale = locales[router.locale || defaultLocale];
  const dir = locale.dir as "ltr" | "rtl";
  const { Component, emotionCache = csEmotionCache[dir], pageProps } = props;

  React.useEffect(() => {
    // Initially set on server-rendered _document.js
    const html = document.querySelector("html");
    if (html) {
      html.setAttribute("lang", locale.id);
      html.setAttribute("dir", locale.dir);
    }

    // Lingui
    i18n.activate(locale.id);
  }, [locale]);

  return (
    <CacheProvider value={emotionCache}>
      <Head>
        <meta name="viewport" content="initial-scale=1, width=device-width" />
      </Head>
      <I18nProvider i18n={i18n}>
        <ThemeProvider theme={themes[dir]}>
          {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
          <CssBaseline />
          <Component {...pageProps} />
        </ThemeProvider>
      </I18nProvider>
    </CacheProvider>
  );
}
