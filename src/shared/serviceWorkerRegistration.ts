import { trackTelemetry } from "./telemetry";
import type { RouterMode } from "./types";

export function registerOptionalServiceWorker(routerMode: RouterMode) {
  if (import.meta.env.VITE_ENABLE_SERVICE_WORKER !== "true" || !("serviceWorker" in navigator)) {
    return;
  }
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js", { updateViaCache: "none" })
      .then((registration) => {
        registration.addEventListener("updatefound", () => {
          trackTelemetry("release_available_detected", routerMode, { source: "service-worker-updatefound" });
        });
      })
      .catch((error) => {
        console.warn("Optional service worker registration failed", error);
      });
  });
}
