import type { ReleaseMetadata, RouterMode, UpdateSeverity } from "../src/shared/types";
import type { VersionState } from "../src/shared/versionCheckClient";

export function testRelease(
  releaseId: string,
  {
    apiContractVersion = "2026-06",
    buildTime = "2026-07-01T00:00:00.000Z",
    routerMode = "react-router",
    updateSeverity = "optional"
  }: {
    apiContractVersion?: string;
    buildTime?: string;
    routerMode?: RouterMode;
    updateSeverity?: UpdateSeverity;
  } = {}
): ReleaseMetadata {
  return {
    releaseId,
    buildTime,
    gitSha: "test",
    deploymentId: `deployment-${releaseId}`,
    minimumSupportedClientRelease: updateSeverity === "required" ? releaseId : "release-a",
    updateSeverity,
    routerMode,
    assetBasePath: `/releases/${releaseId}/`,
    compatibilityWindowExpiresAt: "2026-07-04T00:00:00.000Z",
    featureFlagSnapshotVersion: `ff-${releaseId}`,
    apiContractVersion,
    draftSchemaVersions: { draft: 2, oldDraft: 2, extraDraft: 2 }
  };
}

export function versionState(current: ReleaseMetadata, latest: ReleaseMetadata): VersionState {
  const updateAvailable = current.releaseId !== latest.releaseId;
  return {
    current,
    latest,
    updateAvailable,
    updateSeverity: latest.updateSeverity,
    requiredUpdatePending: updateAvailable && latest.updateSeverity === "required",
    apiContractCompatible: current.apiContractVersion === latest.apiContractVersion,
    checkedAt: "2026-07-01T00:00:00.000Z"
  };
}

export function requiredUpdateState(routerMode: RouterMode = "react-router") {
  const current = testRelease("release-a", {
    buildTime: new Date().toISOString(),
    routerMode
  });
  return {
    ...versionState(current, {
      ...current,
      releaseId: "release-b",
      deploymentId: "deployment-release-b",
      minimumSupportedClientRelease: "release-b",
      updateSeverity: "required",
      assetBasePath: "/releases/release-b/"
    }),
    checkedAt: new Date().toISOString()
  };
}
