const CACHE_NAME = "chunk-skew-release-metadata-v1";

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.pathname === "/version.json") {
    event.respondWith(
      fetch(event.request, { cache: "no-store" })
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          return cached ?? Response.error();
        })
    );
  }
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "WARM_WORKFLOW_ASSETS") {
    event.waitUntil(
      Promise.all(
        (event.data.urls ?? []).map((url) =>
          fetch(url, { cache: "reload" }).catch(() => {
            return undefined;
          })
        )
      )
    );
  }
});
