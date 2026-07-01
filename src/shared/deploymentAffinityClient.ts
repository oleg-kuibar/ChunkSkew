import { getVersionState } from "./versionCheckClient";
import type { RouterMode } from "./types";

export function isDeploymentAffinityActive(routerMode: RouterMode) {
  const state = getVersionState(routerMode);
  return state.latest.skewMode === "affinity";
}

export function isOldAssetRetentionActive(routerMode: RouterMode) {
  const state = getVersionState(routerMode);
  return state.latest.skewMode === "asset-retention";
}
