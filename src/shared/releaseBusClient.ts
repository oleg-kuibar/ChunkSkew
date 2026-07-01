import { startVersionChecks } from "./versionCheckClient";
import type { RouterMode } from "./types";

export function startReleaseAwareness(routerMode: RouterMode) {
  return startVersionChecks(routerMode);
}
