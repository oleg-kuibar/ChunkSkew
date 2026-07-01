import { readJson, writeJson } from "./storage";
import { hasCurrentReleaseIdentityOverride } from "./releaseIdentity";
import { getVersionState } from "./versionCheckClient";
import type { RouterMode, SkewMode } from "./types";

const failingRoutes = new Set([
  "payment-review",
  "invoice-detail",
  "card-detail",
  "kyb-review",
  "transaction-report",
  "tanstack-payment-lazy",
  "tanstack-invoice-lazy",
  "tanstack-pending-lazy",
  "tanstack-error-lazy"
]);

export function getLocalSkewMode(routerMode: RouterMode): SkewMode | undefined {
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
