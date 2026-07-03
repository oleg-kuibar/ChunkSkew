import { apiFetch } from "./apiClient";
import { getLocalSkewMode, setLocalSkewMode } from "./assetRetentionSimulator";
import { isStaticDemoHost } from "./staticDemo";
import { applyReleasePayload, getVersionState } from "./versionCheckClient";
import type { ReleaseMetadata, RouterMode, SkewMode, UpdateSeverity } from "./types";

export const skewModes: SkewMode[] = [
  "no-affinity",
  "affinity",
  "asset-retention",
  "broken",
  "compatibility-window-expired",
  "api-contract-incompatible"
];

export const modeEvent: Partial<Record<SkewMode, Parameters<typeof applyReleasePayload>[2]>> = {
  affinity: "release.rollback",
  "compatibility-window-expired": "asset.retention.expiring",
  "api-contract-incompatible": "api.contract.deprecating"
};

export const modeSeverity: Record<SkewMode, UpdateSeverity> = {
  "no-affinity": "recommended",
  affinity: "optional",
  "asset-retention": "recommended",
  broken: "required",
  "compatibility-window-expired": "required",
  "api-contract-incompatible": "required"
};

export interface DebugState {
  mode: SkewMode;
  activeReleaseId: string;
  latestReleaseId: string;
  updateSeverity: string;
  apiContractVersion: string;
  version: ReleaseMetadata;
}

export function modeLabel(mode: SkewMode) {
  const labels: Record<SkewMode, string> = {
    "no-affinity": "No affinity",
    affinity: "Deployment affinity",
    "asset-retention": "Retained assets",
    broken: "Missing chunks",
    "compatibility-window-expired": "Expired retention",
    "api-contract-incompatible": "API contract block"
  };
  return labels[mode];
}

export function modeCopy(mode: SkewMode) {
  const copy: Record<SkewMode, string> = {
    "no-affinity": "Latest shell, old chunks may disappear.",
    affinity: "Client stays on original deployment.",
    "asset-retention": "Old chunks remain during window.",
    broken: "Old chunks are missing on purpose.",
    "compatibility-window-expired": "Retention window has expired.",
    "api-contract-incompatible": "Risky mutations become read-only."
  };
  return copy[mode];
}

export function staticDebugState(routerMode: RouterMode, mode = getLocalSkewMode(routerMode) ?? "asset-retention"): DebugState {
  const current = getVersionState(routerMode).current;
  const releaseId = "release-b";
  const compatibilityWindowExpiresAt =
    mode === "compatibility-window-expired" ? new Date(Date.now() - 60_000).toISOString() : new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString();
  return {
    mode,
    activeReleaseId: mode === "no-affinity" ? releaseId : current.releaseId,
    latestReleaseId: releaseId,
    updateSeverity: modeSeverity[mode],
    apiContractVersion: mode === "api-contract-incompatible" ? "2026-07" : current.apiContractVersion,
    version: {
      ...current,
      releaseId,
      deploymentId: `deployment-${releaseId}`,
      minimumSupportedClientRelease: modeSeverity[mode] === "required" ? releaseId : current.releaseId,
      updateSeverity: modeSeverity[mode],
      assetBasePath: mode === "affinity" ? `/releases/${current.releaseId}/` : `/releases/${releaseId}/`,
      compatibilityWindowExpiresAt,
      featureFlagSnapshotVersion: `ff-${releaseId}`,
      apiContractVersion: mode === "api-contract-incompatible" ? "2026-07" : current.apiContractVersion,
      skewMode: mode
    }
  };
}

export function staticResetDebugState(routerMode: RouterMode): DebugState {
  const current = getVersionState(routerMode).current;
  return {
    mode: "asset-retention",
    activeReleaseId: current.releaseId,
    latestReleaseId: current.releaseId,
    updateSeverity: "optional",
    apiContractVersion: current.apiContractVersion,
    version: { ...current, updateSeverity: "optional", skewMode: undefined }
  };
}

export async function readDebugState(routerMode: RouterMode) {
  return isStaticDemoHost() ? staticDebugState(routerMode) : apiFetch<DebugState>("/api/debug/version-skew", routerMode);
}

export async function setDebugModeState(routerMode: RouterMode, mode: SkewMode) {
  if (isStaticDemoHost()) {
    return staticDebugState(routerMode, mode);
  }
  return apiFetch<DebugState>("/api/debug/version-skew/mode", routerMode, {
    method: "POST",
    body: JSON.stringify({ mode })
  });
}

export function resetBrowserSimulationState(routerMode: RouterMode) {
  const prefix = "chunk-skew-finance:";
  for (const storage of [window.localStorage, window.sessionStorage]) {
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(
      (key): key is string => Boolean(key?.startsWith(prefix))
    );
    for (const key of keys) {
      storage.removeItem(key);
    }
  }
  window.localStorage.setItem(`${prefix}debug`, "1");
  window.localStorage.setItem(`${prefix}router-mode`, routerMode);
  window.dispatchEvent(new CustomEvent("chunk-skew-storage", { detail: { key: "simulation-reset" } }));
}

export async function resetDebugState(routerMode: RouterMode) {
  resetBrowserSimulationState(routerMode);
  if (isStaticDemoHost()) {
    return staticResetDebugState(routerMode);
  }
  return apiFetch<DebugState>("/api/debug/version-skew/reset", routerMode, {
    method: "POST"
  });
}

export function applyDebugState(routerMode: RouterMode, data: DebugState) {
  setLocalSkewMode(routerMode, data.mode);
  applyReleasePayload(routerMode, data.version, modeEvent[data.mode]);
}
