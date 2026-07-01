import { fetchVersionMetadata, getCurrentReleaseIdentity, setCurrentReleaseIdentityOverride } from "./releaseIdentity";
import { readJson, writeJson } from "./storage";
import { trackTelemetry } from "./telemetry";
import type { ReleaseMetadata, RouterMode, UpdateSeverity } from "./types";

export interface VersionState {
  current: ReleaseMetadata;
  latest: ReleaseMetadata;
  updateAvailable: boolean;
  updateSeverity: UpdateSeverity;
  requiredUpdatePending: boolean;
  apiContractCompatible: boolean;
  checkedAt: string;
  checkFailed?: string;
}

const stateKey = "version-state";
const emitter = new EventTarget();
let pollingId: number | undefined;
let releaseBus: EventSource | WebSocket | undefined;

export function getVersionState(routerMode: RouterMode): VersionState {
  return readJson<VersionState>("version-state", {
    current: getCurrentReleaseIdentity(routerMode),
    latest: getCurrentReleaseIdentity(routerMode),
    updateAvailable: false,
    updateSeverity: "optional",
    requiredUpdatePending: false,
    apiContractCompatible: true,
    checkedAt: new Date(0).toISOString()
  });
}

function compareRelease(current: ReleaseMetadata, latest: ReleaseMetadata): VersionState {
  const updateAvailable = current.releaseId !== latest.releaseId;
  const requiredUpdatePending = updateAvailable && latest.updateSeverity === "required";
  return {
    current,
    latest,
    updateAvailable,
    updateSeverity: latest.updateSeverity,
    requiredUpdatePending,
    apiContractCompatible: current.apiContractVersion === latest.apiContractVersion,
    checkedAt: new Date().toISOString()
  };
}

function setVersionState(next: VersionState) {
  writeJson(stateKey, next);
  emitter.dispatchEvent(new CustomEvent("version-state", { detail: next }));
}

export async function checkForVersionUpdate(routerMode: RouterMode, reason: string) {
  const current = getCurrentReleaseIdentity(routerMode);
  trackTelemetry("version_check_started", routerMode, { reason });
  try {
    const latest = await fetchVersionMetadata(routerMode);
    const next = compareRelease(current, latest);
    setVersionState(next);
    trackTelemetry("version_check_succeeded", routerMode, {
      reason,
      latestReleaseId: latest.releaseId,
      updateSeverity: latest.updateSeverity
    });
    if (next.updateAvailable) {
      trackTelemetry(
        next.requiredUpdatePending ? "release_required_detected" : "release_available_detected",
        routerMode,
        { latestReleaseId: latest.releaseId, skewMode: latest.skewMode }
      );
    }
    if (!next.apiContractCompatible) {
      trackTelemetry("api_contract_incompatible_detected", routerMode, {
        currentContract: current.apiContractVersion,
        latestContract: latest.apiContractVersion
      });
    }
    return next;
  } catch (error) {
    const failed = {
      ...getVersionState(routerMode),
      checkFailed: error instanceof Error ? error.message : String(error),
      checkedAt: new Date().toISOString()
    };
    setVersionState(failed);
    trackTelemetry("version_check_failed", routerMode, { reason, error: failed.checkFailed });
    return failed;
  }
}

export function applyReleasePayload(routerMode: RouterMode, payload: ReleaseMetadata) {
  const next = compareRelease(getCurrentReleaseIdentity(routerMode), payload);
  setVersionState(next);
  if (payload.updateSeverity === "required") {
    trackTelemetry("release_required_detected", routerMode, { latestReleaseId: payload.releaseId });
  } else {
    trackTelemetry("release_available_detected", routerMode, {
      latestReleaseId: payload.releaseId,
      updateSeverity: payload.updateSeverity
    });
  }
}

export function forceVersionState(routerMode: RouterMode, severity: UpdateSeverity) {
  const current = getCurrentReleaseIdentity(routerMode);
  const latest: ReleaseMetadata = {
    ...current,
    releaseId: severity === "optional" ? current.releaseId : "release-b",
    deploymentId: severity === "optional" ? current.deploymentId : "deployment-release-b",
    updateSeverity: severity,
    minimumSupportedClientRelease: severity === "required" ? "release-b" : current.releaseId
  };
  setVersionState(compareRelease(current, latest));
}

export function prepareSafeRefresh(routerMode: RouterMode) {
  const state = getVersionState(routerMode);
  const latest = { ...state.latest, routerMode };
  setCurrentReleaseIdentityOverride(routerMode, latest);
  setVersionState(compareRelease(latest, latest));
  return latest;
}

export function startVersionChecks(routerMode: RouterMode) {
  void checkForVersionUpdate(routerMode, "startup");
  if (pollingId) {
    window.clearInterval(pollingId);
  }
  pollingId = window.setInterval(() => void checkForVersionUpdate(routerMode, "poll"), 45_000);
  const focusHandler = () => void checkForVersionUpdate(routerMode, "window-focus");
  const onlineHandler = () => void checkForVersionUpdate(routerMode, "network-reconnect");
  window.addEventListener("focus", focusHandler);
  window.addEventListener("online", onlineHandler);
  startReleaseBus(routerMode);
  return () => {
    if (pollingId) {
      window.clearInterval(pollingId);
    }
    window.removeEventListener("focus", focusHandler);
    window.removeEventListener("online", onlineHandler);
    releaseBus?.close();
  };
}

function startReleaseBus(routerMode: RouterMode) {
  releaseBus?.close();
  const busMode = import.meta.env.VITE_RELEASE_BUS_MODE ?? "sse";
  if (busMode === "websocket") {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(`${protocol}://${window.location.host}/events-ws`);
    socket.addEventListener("message", (event) => {
      const data = JSON.parse(String(event.data)) as { event: string; payload: ReleaseMetadata };
      applyReleasePayload(routerMode, data.payload);
    });
    releaseBus = socket;
    return;
  }
  const current = getCurrentReleaseIdentity(routerMode);
  const events = new EventSource(
    `/events?routerMode=${encodeURIComponent(routerMode)}&clientRelease=${encodeURIComponent(current.releaseId)}`
  );
  for (const eventName of [
    "release.available",
    "release.recommended",
    "release.required",
    "release.rollback",
    "asset.retention.expiring",
    "api.contract.deprecating"
  ]) {
    events.addEventListener(eventName, (event) => {
      const payload = JSON.parse((event as MessageEvent).data) as ReleaseMetadata;
      if (eventName === "asset.retention.expiring") {
        trackTelemetry("asset_retention_expiring_detected", routerMode, {
          compatibilityWindowExpiresAt: payload.compatibilityWindowExpiresAt
        });
      }
      if (eventName === "api.contract.deprecating") {
        trackTelemetry("api_contract_deprecating_detected", routerMode, {
          apiContractVersion: payload.apiContractVersion
        });
      }
      applyReleasePayload(routerMode, payload);
    });
  }
  releaseBus = events;
}

export function subscribeVersionState(callback: () => void) {
  const handler = () => callback();
  emitter.addEventListener("version-state", handler);
  window.addEventListener("chunk-skew-storage", handler);
  return () => {
    emitter.removeEventListener("version-state", handler);
    window.removeEventListener("chunk-skew-storage", handler);
  };
}
