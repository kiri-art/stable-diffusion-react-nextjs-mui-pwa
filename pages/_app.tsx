import * as React from "react";
import Head from "next/head";
import { AppProps } from "next/app";
import { useRouter } from "next/router";
// import { useGongoIsPopulated } from "gongo-client-react";
import { t } from "@lingui/macro";

import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { CacheProvider, EmotionCache } from "@emotion/react";

import "../src/db";
import themes from "../src/theme";
import createEmotionCache from "../src/createEmotionCache";
import locales, { defaultLocale } from "../src/lib/locales";
import { i18n, I18nProvider } from "../src/lib/i18n";

function workboxStuff() {
  if (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    // @ts-expect-error: blah
    window.workbox !== undefined
  ) {
    // @ts-expect-error: blah
    const wb = window.workbox;
    // add event listeners to handle any of PWA lifecycle event
    // https://developers.google.com/web/tools/workbox/reference-docs/latest/module-workbox-window.Workbox#events
    // @ts-expect-error: blah
    wb.addEventListener("installed", (event) => {
      console.log(`Event ${event.type} is triggered.`);
      console.log(event);
    });

    // @ts-expect-error: blah
    wb.addEventListener("controlling", (event) => {
      console.log(`Event ${event.type} is triggered.`);
      console.log(event);
    });

    // @ts-expect-error: blah
    wb.addEventListener("activated", (event) => {
      console.log(`Event ${event.type} is triggered.`);
      console.log(event);
    });

    // A common UX pattern for progressive web apps is to show a banner when a service worker has updated and waiting to install.
    // NOTE: MUST set skipWaiting to false in next.config.js pwa object
    // https://developers.google.com/web/tools/workbox/guides/advanced-recipes#offer_a_page_reload_for_users
    // @ts-expect-error: blah
    const promptNewVersionAvailable = (_event) => {
      // `event.wasWaitingBeforeRegister` will be false if this is the first time the updated service worker is waiting.
      // When `event.wasWaitingBeforeRegister` is true, a previously updated service worker is still waiting.
      // You may want to customize the UI prompt accordingly.
      if (
        confirm(
          t`A newer version of this web app is available, reload to update?`
        )
      ) {
        // @ts-expect-error: blah
        wb.addEventListener("controlling", (_event) => {
          window.location.reload();
        });

        // Send a message to the waiting service worker, instructing it to activate.
        wb.messageSkipWaiting();
      } else {
        console.log(
          "User rejected to reload the web app, keep using old version. New version will be automatically load when user open the app next time."
        );
      }
    };

    wb.addEventListener("waiting", promptNewVersionAvailable);

    // ISSUE - this is not working as expected, why?
    // I could only make message event listenser work when I manually add this listenser into sw.js file
    // @ts-expect-error: blah
    wb.addEventListener("message", (event) => {
      console.log(`Event ${event.type} is triggered.`);
      console.log(event);
    });

    /*
    wb.addEventListener('redundant', event => {
      console.log(`Event ${event.type} is triggered.`)
      console.log(event)
    })
    wb.addEventListener('externalinstalled', event => {
      console.log(`Event ${event.type} is triggered.`)
      console.log(event)
    })
    wb.addEventListener('externalactivated', event => {
      console.log(`Event ${event.type} is triggered.`)
      console.log(event)
    })
    */

    // never forget to call register as auto register is turned off in next.config.js
    wb.register();
  }
}

interface MyAppProps extends AppProps {
  emotionCache?: EmotionCache;
}

// Client-side caches, shared for the whole session of the user in the browser.
const csEmotionCache = {
  ltr: createEmotionCache("ltr"),
  rtl: createEmotionCache("rtl"),
};

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
          content="minimum-scale=1, initial-scale=1, width=device-width, shrink-to-fit=no, user-scalable=no, viewport-fit=cover"
        />
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
