// import { t } from "@lingui/macro";
const t = String.raw.bind(String);

import type { BroadcastMessage } from "serwist";
import asyncConfirm from "./asyncConfirm";

const UPDATE_INTERVAL = 60_000;

const startTime = Date.now();

export default function serwistStuff() {
  if (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    window.serwist !== undefined
  ) {
    const sw = window.serwist;

    // add event listeners to handle any of PWA lifecycle event
    // https://developers.google.com/web/tools/workbox/reference-docs/latest/module-workbox-window.Workbox#events
    sw.addEventListener("installed", (event) => {
      console.log(`Event ${event.type} is triggered.`);
      console.log(event);
    });

    sw.addEventListener("controlling", (event) => {
      console.log(`Event ${event.type} is triggered.`);
      console.log(event);
    });

    sw.addEventListener("activated", (event) => {
      console.log(`Event ${event.type} is triggered.`);
      console.log(event);
    });

    // A common UX pattern for progressive web apps is to show a banner when a service worker has updated and waiting to install.
    // NOTE: MUST set skipWaiting to false in next.config.js pwa object
    // https://developers.google.com/web/tools/workbox/guides/advanced-recipes#offer_a_page_reload_for_users
    const promptNewVersionAvailable = async (_event) => {
      console.log("Event waiting is triggered.", _event);
      // `event.wasWaitingBeforeRegister` will be false if this is the first time the updated service worker is waiting.
      // When `event.wasWaitingBeforeRegister` is true, a previously updated service worker is still waiting.
      // You may want to customize the UI prompt accordingly.
      if (
        await asyncConfirm(
          t`A newer version of this web app is available, reload to update?`,
        )
      ) {
        sw.addEventListener("controlling", (_event) => {
          window.location.reload();
        });

        // Send a message to the waiting service worker, instructing it to activate.
        sw.messageSkipWaiting();
      } else {
        console.log(
          "User rejected to reload the web app, keep using old version. New version will be automatically load when user open the app next time.",
        );
      }
    };

    sw.addEventListener("waiting", promptNewVersionAvailable);

    sw.addEventListener("controlling", async (event) => {
      // The time check is because we don't want to display the prompt if
      // the new service worker is installed on the first load.  Only on update.
      if (event.isUpdate && Date.now() > startTime + UPDATE_INTERVAL - 1000) {
        console.log({
          isUpdate: event.isUpdate,
          startTime,
          UPDATE_INTERVAL,
          now: Date.now(),
          bool: Date.now() > startTime + UPDATE_INTERVAL - 1000,
        });
        if (
          await asyncConfirm(
            t`A newer version of this web app is available, reload to update?`,
          )
        ) {
          window.location.reload();
        } else {
          console.log(
            "User rejected to reload the web app, keep using old version, which might disfunction with newly loaded serviceworker",
          );
        }
      }
    });

    sw.addEventListener("message", (event) => {
      if (
        event.data.meta === "serwist-broadcast-update" &&
        event.data.type === "CACHE_UPDATED"
      ) {
        const {
          payload: { updatedURL },
        }: BroadcastMessage = event.data;

        console.log(`A newer version of ${updatedURL} is available!`);
      }
    });

    // ISSUE - this is not working as expected, why?  (for workbox, didn't test serwist)
    // I could only make message event listenser work when I manually add this listenser into sw.js file
    sw.addEventListener("message", (event) => {
      console.log(`Event ${event.type} is triggered.`);
      console.log(event);
    });

    sw.addEventListener("redundant", (event) => {
      console.log(`Event ${event.type} is triggered.`);
      console.log(event);
    });

    // never forget to call register as auto register is turned off in next.config.js
    sw.register();

    let interval;
    if (typeof navigator === "object" && "serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(function (registration) {
        console.log(
          `[PWA] Will check for updates ever ${UPDATE_INTERVAL / 1000} seconds`,
        );
        interval = setInterval(() => {
          console.log("[PWA] Checking for updates...");
          registration.update();
        }, UPDATE_INTERVAL);
      });
    }

    /*
    window.addEventListener("beforeinstallprompt", (event) => {
      // https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt
      console.log("beforeinstallprompt - TODO");
    });
    */

    return function cleanup() {
      clearInterval(interval);
      if (typeof navigator === "object" && "serviceWorker" in navigator) {
        navigator.serviceWorker.ready.then(function (registration) {
          registration.unregister();
        });
      }
    };
  }
}
