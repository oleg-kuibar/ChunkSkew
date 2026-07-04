import { expect, test } from "@playwright/test";

async function clearServiceWorkerState(page: import("@playwright/test").Page) {
  await page.evaluate(async () => {
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key.startsWith("chunk-skew-")).map((key) => caches.delete(key)));
    }
  });
}

test("optional service worker caches release metadata and acknowledges asset warming", async ({ page }) => {
  await page.goto("/?debug=1&router=react");
  await expect(page.getByRole("heading", { name: "Three simple examples" })).toBeVisible();
  await clearServiceWorkerState(page);

  const registered = await page.evaluate(async () => {
    if (!("serviceWorker" in navigator) || !("caches" in window)) {
      return false;
    }
    await navigator.serviceWorker.register("/service-worker.js", { updateViaCache: "none" });
    await navigator.serviceWorker.ready;
    return true;
  });
  expect(registered).toBe(true);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Three simple examples" })).toBeVisible();

  const lifecycle = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    const versionUrl = `/version.json?sw-cache-check=${crypto.randomUUID()}`;
    await fetch(versionUrl, { cache: "reload" });

    let cachedVersion = false;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      cachedVersion = Boolean(await caches.match(versionUrl));
      if (cachedVersion) {
        break;
      }
      await new Promise((resolve) => window.setTimeout(resolve, 50));
    }

    const warmAck = new Promise<{ type?: string; requested?: number; warmed?: number }>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error("Timed out waiting for service worker warm acknowledgement")), 5000);
      navigator.serviceWorker.addEventListener(
        "message",
        (event) => {
          window.clearTimeout(timeout);
          resolve(event.data);
        },
        { once: true }
      );
    });

    registration.active?.postMessage({
      type: "WARM_WORKFLOW_ASSETS",
      urls: [`/version.json?warm-check=${crypto.randomUUID()}`]
    });

    return {
      cachedVersion,
      controlled: Boolean(navigator.serviceWorker.controller),
      warmAck: await warmAck
    };
  });

  expect(lifecycle).toMatchObject({
    cachedVersion: true,
    controlled: true,
    warmAck: {
      requested: 1,
      type: "WORKFLOW_ASSETS_WARMED",
      warmed: 1
    }
  });

  await clearServiceWorkerState(page);
});
