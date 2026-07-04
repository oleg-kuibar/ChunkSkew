import { readJson, readSessionFlag, writeJson, writeSessionFlag } from "./storage";
import { hasCurrentReleaseIdentityOverride } from "./releaseIdentity";
import { getVersionState } from "./versionCheckClient";
import type { RouterMode, SkewMode } from "./types";

const failingRoutes = new Set([
  "draft-check",
  "bad-draft-check",
  "retained-file",
  "tanstack-draft-route",
  "tanstack-pending-lazy",
  "tanstack-bad-draft-route"
]);

export function getLocalSkewMode(routerMode: RouterMode): SkewMode | undefined {
  const sessionMode = readSessionFlag(`local-skew-mode:${routerMode}`) as SkewMode | null;
  if (sessionMode) {
    return sessionMode;
  }
  return readJson<Record<RouterMode, SkewMode | undefined>>("local-skew-mode", {
    "react-router": undefined,
    "tanstack-router": undefined
  })[routerMode];
}

export function setLocalSkewMode(routerMode: RouterMode, mode: SkewMode | undefined) {
  const state = readJson<Record<RouterMode, SkewMode | undefined>>("local-skew-mode", {
    "react-router": undefined,
    "tanstack-router": undefined
  });
  state[routerMode] = mode;
  writeJson("local-skew-mode", state);
  writeSessionFlag(`local-skew-mode:${routerMode}`, mode ?? "");
}

export function shouldSimulateChunkFailure(routeId: string, routerMode: RouterMode) {
  const versionState = getVersionState(routerMode);
  if (hasCurrentReleaseIdentityOverride(routerMode) && versionState.current.releaseId === versionState.latest.releaseId) {
    return false;
  }
  const local = getLocalSkewMode(routerMode);
  const remote = versionState.latest.skewMode;
  const mode = local ?? remote;
  if (!failingRoutes.has(routeId)) {
    return false;
  }
  return mode === "broken" || mode === "no-affinity" || mode === "compatibility-window-expired";
}

export function shouldReportRetention(routerMode: RouterMode) {
  const mode = getLocalSkewMode(routerMode) ?? getVersionState(routerMode).latest.skewMode;
  return mode === "asset-retention" || mode === "affinity";
}
