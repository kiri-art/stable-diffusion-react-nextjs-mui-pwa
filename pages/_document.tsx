import * as React from "react";
import Document, { Html, Head, Main, NextScript } from "next/document";
import createEmotionServer from "@emotion/server/create-instance";

import themes from "../src/theme";
import createEmotionCache from "../src/createEmotionCache";
import locales, { defaultLocale } from "../src/lib/locales";

export default class MyDocument extends Document {
  render() {
    // Server-rendered here, but changed dynamically in _app.js
    const { locale = defaultLocale } = this.props.__NEXT_DATA__;
    const localeData = locales[locale];
    const dir = localeData.dir;
    // @ts-expect-error: TODO
    const theme = themes[dir];

    return (
      <Html lang={locale} dir={dir} style={{ height: "100%" }}>
        <Head>
          {/* PWA primary color */}
          <meta name="theme-color" content={theme.palette.primary.main} />
          <link rel="shortcut icon" href="/favicon.ico" />
          <link
            rel="stylesheet"
            href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap"
          />
          <meta name="emotion-insertion-point" content="" />
          {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (this.props as any).emotionStyleTags
          }
          <meta name="application-name" content="SD MUI" />
          <link rel="manifest" href="/manifest.webmanifest" />

          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta
            name="apple-mobile-web-app-status-bar-style"
            content="default"
          />
          <meta name="apple-mobile-web-app-title" content="SD MUI" />
          <meta
            name="description"
            content="PWA frontend for Stable Diffusion"
          />
          <meta name="format-detection" content="telephone=no" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta
            name="msapplication-config"
            content="/icons/browserconfig.xml"
          />
          <meta name="msapplication-TileColor" content="#2B5797" />
          <meta name="msapplication-tap-highlight" content="no" />
          <meta name="theme-color" content="#000000" />

          {/*
          <link rel="apple-touch-icon" href="/icons/touch-icon-iphone.png" />
          <link
            rel="apple-touch-icon"
            sizes="152x152"
            href="/icons/touch-icon-ipad.png"
          />
          <link
            rel="apple-touch-icon"
            sizes="180x180"
            href="/icons/touch-icon-iphone-retina.png"
          />
          <link
            rel="apple-touch-icon"
            sizes="167x167"
            href="/icons/touch-icon-ipad-retina.png"
          />

          <link
            rel="icon"
            type="image/png"
            sizes="32x32"
            href="/icons/favicon-32x32.png"
          />
          <link
            rel="icon"
            type="image/png"
            sizes="16x16"
            href="/icons/favicon-16x16.png"
          />
          <link
            rel="mask-icon"
            href="/icons/safari-pinned-tab.svg"
            color="#5bbad5"
          />
          <meta name="twitter:card" content="summary" />
          <meta name="twitter:url" content="https://yourdomain.com" />
          <meta name="twitter:title" content="PWA App" />
          <meta
            name="twitter:description"
            content="Best PWA App in the world"
          />
          <meta
            name="twitter:image"
            content="https://yourdomain.com/icons/android-chrome-192x192.png"
          />
          <meta name="twitter:creator" content="@DavidWShadow" />
          <meta property="og:type" content="website" />
          <meta property="og:title" content="PWA App" />
          <meta property="og:description" content="Best PWA App in the world" />
          <meta property="og:site_name" content="PWA App" />
          <meta property="og:url" content="https://yourdomain.com" />
          <meta
            property="og:image"
            content="https://yourdomain.com/icons/apple-touch-icon.png"
          />
          */}

          {/* <!-- apple splash screen images -->
            <!--
            <link rel='apple-touch-startup-image' href='/images/apple_splash_2048.png' sizes='2048x2732' />
            <link rel='apple-touch-startup-image' href='/images/apple_splash_1668.png' sizes='1668x2224' />
            <link rel='apple-touch-startup-image' href='/images/apple_splash_1536.png' sizes='1536x2048' />
            <link rel='apple-touch-startup-image' href='/images/apple_splash_1125.png' sizes='1125x2436' />
            <link rel='apple-touch-startup-image' href='/images/apple_splash_1242.png' sizes='1242x2208' />
            <link rel='apple-touch-startup-image' href='/images/apple_splash_750.png' sizes='750x1334' />
            <link rel='apple-touch-startup-image' href='/images/apple_splash_640.png' sizes='640x1136' />
          --> */}
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

// `getInitialProps` belongs to `_document` (instead of `_app`),
// it's compatible with static-site generation (SSG).
MyDocument.getInitialProps = async (ctx) => {
  // Resolution order
  //
  // On the server:
  // 1. app.getInitialProps
  // 2. page.getInitialProps
  // 3. document.getInitialProps
  // 4. app.render
  // 5. page.render
  // 6. document.render
  //
  // On the server with error:
  // 1. document.getInitialProps
  // 2. app.render
  // 3. page.render
  // 4. document.render
  //
  // On the client
  // 1. app.getInitialProps
  // 2. page.getInitialProps
  // 3. app.render
  // 4. page.render

  const originalRenderPage = ctx.renderPage;
  const locale = ctx.locale || defaultLocale;
  const localeData = locales[locale];

  // You can consider sharing the same Emotion cache between all the SSR requests to speed up performance.
  // However, be aware that it can have global side effects.
  const cache = createEmotionCache(localeData.dir);
  const { extractCriticalToChunks } = createEmotionServer(cache);

  ctx.renderPage = () =>
    originalRenderPage({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      enhanceApp: (App: any) =>
        function EnhanceApp(props) {
          return <App emotionCache={cache} {...props} />;
        },
    });

  const initialProps = await Document.getInitialProps(ctx);
  // This is important. It prevents Emotion to render invalid HTML.
  // See https://github.com/mui/material-ui/issues/26561#issuecomment-855286153
  const emotionStyles = extractCriticalToChunks(initialProps.html);
  const emotionStyleTags = emotionStyles.styles.map((style) => (
    <style
      data-emotion={`${style.key} ${style.ids.join(" ")}`}
      key={style.key}
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: style.css }}
    />
  ));

  return {
    ...initialProps,
    emotionStyleTags,
  };
};
