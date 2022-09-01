import rtlPlugin from "stylis-plugin-rtl";
import { prefixer } from "stylis";
import createCache from "@emotion/cache";

const isBrowser = typeof document !== "undefined";

// On the client side, Create a meta tag at the top of the <head> and set it as insertionPoint.
// This assures that MUI styles are loaded first.
// It allows developers to easily override MUI styles with other styling solutions, like CSS modules.
/*
export default function createEmotionCache() {
  let insertionPoint;

  if (isBrowser) {
    const emotionInsertionPoint = document.querySelector<HTMLMetaElement>(
      'meta[name="emotion-insertion-point"]'
    );
    insertionPoint = emotionInsertionPoint ?? undefined;
  }

  return createCache({ key: "mui-style", insertionPoint });
}
*/

export default function createEmotionCache(dir = "ltr") {
  if (dir === "ltr")
    return createCache({
      key: "css",
    });
  else if (dir === "rtl")
    return createCache({
      key: "muirtl",
      stylisPlugins: [prefixer, rtlPlugin],
    });
  else
    throw new Error(
      "createEmotionCache(dir): dir should be 'rtl'/'ltr' not " +
        JSON.stringify(dir)
    );
}
