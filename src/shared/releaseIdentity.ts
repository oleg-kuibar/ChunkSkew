import type { ReleaseMetadata, RouterMode } from "./types";
import { readJson, readSessionFlag, writeJson, writeSessionFlag } from "./storage";

const defaultDraftVersions = {
  payment: 2,
  kyb: 2,
  card: 2,
  invoice: 2,
  vendor: 2
};

export function getBundledReleaseIdentity(routerMode: RouterMode): ReleaseMetadata {
  const releaseId = import.meta.env.VITE_RELEASE_ID ?? __APP_RELEASE_ID__ ?? "dev-local";
  return {
    releaseId,
    buildTime: import.meta.env.VITE_BUILD_TIME ?? new Date(0).toISOString(),
    gitSha: import.meta.env.VITE_GIT_SHA ?? "dev",
    deploymentId: import.meta.env.VITE_DEPLOYMENT_ID ?? `deployment-${releaseId}`,
    minimumSupportedClientRelease: import.meta.env.VITE_MIN_SUPPORTED_RELEASE ?? releaseId,
    updateSeverity: (import.meta.env.VITE_UPDATE_SEVERITY ?? "optional") as ReleaseMetadata["updateSeverity"],
    routerMode,
    assetBasePath: import.meta.env.VITE_ASSET_BASE_PATH ?? "/",
    compatibilityWindowExpiresAt:
      import.meta.env.VITE_COMPAT_WINDOW_EXPIRES_AT ?? new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
    featureFlagSnapshotVersion: import.meta.env.VITE_FEATURE_FLAGS_VERSION ?? `ff-${releaseId}`,
    apiContractVersion: import.meta.env.VITE_API_CONTRACT_VERSION ?? "2026-06",
    draftSchemaVersions: defaultDraftVersions
  };
}

export function getCurrentReleaseIdentity(routerMode: RouterMode): ReleaseMetadata {
  const baseIdentity = getBundledReleaseIdentity(routerMode);
  const sessionOverride = readReleaseOverrideFromSession(routerMode);
  const override = sessionOverride ?? readJson<Partial<Record<RouterMode, ReleaseMetadata>>>("current-release-overrides", {})[routerMode];
  return override ? { ...override, routerMode } : baseIdentity;
}

export function hasCurrentReleaseIdentityOverride(routerMode: RouterMode) {
  return Boolean(
    readReleaseOverrideFromSession(routerMode) ??
      readJson<Partial<Record<RouterMode, ReleaseMetadata>>>("current-release-overrides", {})[routerMode]
  );
}

export function setCurrentReleaseIdentityOverride(routerMode: RouterMode, release: ReleaseMetadata) {
  const overrides = readJson<Partial<Record<RouterMode, ReleaseMetadata>>>("current-release-overrides", {});
  overrides[routerMode] = { ...release, routerMode };
  writeJson("current-release-overrides", overrides);
  writeSessionFlag(`current-release-override:${routerMode}`, JSON.stringify({ ...release, routerMode }));
}

function readReleaseOverrideFromSession(routerMode: RouterMode) {
  const raw = readSessionFlag(`current-release-override:${routerMode}`);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as ReleaseMetadata;
  } catch {
    return null;
  }
}

export function isDebugMode() {
  if (typeof window === "undefined") {
    return false;
  }
  const params = new URLSearchParams(window.location.search);
  return params.get("debug") === "1" || window.localStorage.getItem("chunk-skew-finance:debug") === "1";
}

export function setDebugMode(enabled: boolean) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem("chunk-skew-finance:debug", enabled ? "1" : "0");
}

export async function fetchVersionMetadata(routerMode: RouterMode): Promise<ReleaseMetadata> {
  const current = getCurrentReleaseIdentity(routerMode);
  const response = await fetch(`/version.json?routerMode=${routerMode}&t=${Date.now()}`, {
    cache: "no-store",
    headers: {
      "x-router-mode": routerMode,
      "x-client-release": current.releaseId,
      "x-client-deployment-id": current.deploymentId
    }
  });
  if (!response.ok) {
    throw new Error(`Version check failed with ${response.status}`);
  }
  return response.json() as Promise<ReleaseMetadata>;
}
