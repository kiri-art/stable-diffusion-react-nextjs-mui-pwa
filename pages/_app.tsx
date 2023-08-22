import * as React from "react";
import Head from "next/head";
import { AppProps } from "next/app";
import { Analytics } from "@vercel/analytics/react";
import { useRouter } from "next/router";
// import { useGongoIsPopulated } from "gongo-client-react";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { CacheProvider, EmotionCache } from "@emotion/react";

import "../src/db";
import themes from "../src/theme";
import createEmotionCache from "../src/createEmotionCache";
import locales, { defaultLocale } from "../src/lib/locales";
import { i18n, I18nProvider } from "../src/lib/i18n";
import workboxStuff from "../src/workboxStuff";
import { ConfirmDialog } from "../src/asyncConfirm";

interface MyAppProps extends AppProps {
  emotionCache?: EmotionCache;
}

// Client-side caches, shared for the whole session of the user in the browser.
const csEmotionCache = {
  ltr: createEmotionCache("ltr"),
  rtl: createEmotionCache("rtl"),
};

if (typeof document === "object") {
  document.addEventListener("readystatechange", () => {
    if (document.readyState === "complete") {
      const match = location.hash.match(/[#&]ref=(?<ref>[^&]+)/);
      const ref = match && match.groups && match.groups.ref;
      if (ref && match.index !== undefined) {
        localStorage.setItem("ref", ref);
        location.hash =
          location.hash.substring(0, match.index) +
          location.hash.substring(match.index + match[0].length);
      }
    }
  });
}

export default function MyApp(props: MyAppProps) {
  // const isPopulated = useGongoIsPopulated();
  // const isServer = typeof document === "undefined";
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
    // When we need to add dynamic language loading...
    // https://lingui.js.org/guides/dynamic-loading-catalogs.html#final-i18n-loader-helper
    i18n.activate(locale.id);
  }, [locale]);

  React.useEffect(() => {
    workboxStuff();
  }, []);

  // if (!isServer && !isPopulated) return <div>Loading...</div>;

  return (
    <CacheProvider value={emotionCache}>
      <Head>
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, user-scalable=yes, viewport-fit=cover"
        />
      </Head>
      <I18nProvider i18n={i18n}>
        <ThemeProvider theme={themes[dir]}>
          {/* CssBaseline kickstart an elegant, consistent, and simple baseline to build upon. */}
          <CssBaseline />
          <Component {...pageProps} />
          <Analytics />
        </ThemeProvider>
      </I18nProvider>
      <ToastContainer
        position="bottom-center"
        autoClose={1500}
        hideProgressBar
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss={false}
        draggable={false}
        pauseOnHover
      />
      <ConfirmDialog />
    </CacheProvider>
  );
}
