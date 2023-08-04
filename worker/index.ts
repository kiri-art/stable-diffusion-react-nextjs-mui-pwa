/// <reference no-default-lib="true"/>
/// <reference lib="ES2015" />
/// <reference lib="webworker" />

// Default type of `self` is `WorkerGlobalScope & typeof globalThis`
// https://github.com/microsoft/TypeScript/issues/14877
export type {};
declare const self: ServiceWorkerGlobalScope;

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "POST") return;
  const url = new URL(event.request.url);
  if (url.pathname !== "/share_target") return;
  if (url.searchParams.get("redirected") === "1") return;

  console.log("index v2");
  event.respondWith(Response.redirect("/share_target?redirect=1", 303));

  event.waitUntil(
    (async () => {
      console.log("event", event);
      await nextMessage("wbs-loaded");
      console.log("wbs-loaded");
      const data = await event.request.formData();
      console.log("data", data);
      const client = await self.clients.get(
        event.resultingClientId || event.clientId
      );
      console.log("client", client);
      const image = data.get("image");
      console.log("image", image);
      // @ts-expect-error: TODO
      client.postMessage({ type: "from_share_target", image });
      // during dev only, to make inspection easier
      // uncomment for prod
      // return Response.redirect("/share_target?redirected=1", 303);
    })()
  );
});

// nextMessage code from Jake Archibald
// https://github.com/GoogleChromeLabs/squoosh/blob/dev/src/sw/util.ts#L109

const nextMessageResolveMap = new Map<string, (() => void)[]>();

/**
 * Wait on a message with a particular event.data value.
 *
 * @param dataVal The event.data value.
 */
function nextMessage(dataVal: string): Promise<void> {
  return new Promise((resolve) => {
    if (!nextMessageResolveMap.has(dataVal)) {
      nextMessageResolveMap.set(dataVal, []);
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    nextMessageResolveMap.get(dataVal)!.push(resolve);
  });
}

self.addEventListener("message", (event) => {
  const resolvers = nextMessageResolveMap.get(event.data);
  if (!resolvers) return;
  nextMessageResolveMap.delete(event.data);
  for (const resolve of resolvers) resolve();
});
