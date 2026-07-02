import { expect, test } from "@playwright/test";
import { decideUpdatePolicyForState, type PolicyInput } from "../src/shared/updatePolicyEngine";
import type { ReleaseMetadata, UpdateSeverity } from "../src/shared/types";
import type { VersionState } from "../src/shared/versionCheckClient";

const routerMode = "react-router";

const baseInput: PolicyInput = {
  routerMode,
  currentRoute: "/payments/create/review",
  workflowType: "payment",
  routeIsLazyLoaded: true,
  dirtyForm: false,
  mutationPending: false,
  navigationPending: false,
  mfaPending: false,
  idempotencyKeyPresent: true,
  lastInteractionAt: 0,
  sensitiveWorkflow: false,
  requiredWorkflowChunksPreloaded: true,
  oldAssetRetentionActive: false,
  deploymentAffinityActive: false,
  apiContractCompatible: true
};

function release(releaseId: string, updateSeverity: UpdateSeverity = "optional", apiContractVersion = "2026-06"): ReleaseMetadata {
  return {
    releaseId,
    buildTime: "2026-07-01T00:00:00.000Z",
    gitSha: releaseId,
    deploymentId: `deployment-${releaseId}`,
    minimumSupportedClientRelease: updateSeverity === "required" ? releaseId : "release-a",
    updateSeverity,
    routerMode,
    assetBasePath: `/releases/${releaseId}/`,
    compatibilityWindowExpiresAt: "2026-07-04T00:00:00.000Z",
    featureFlagSnapshotVersion: `ff-${releaseId}`,
    apiContractVersion,
    draftSchemaVersions: { payment: 2, kyb: 2, card: 2, invoice: 2, vendor: 2 }
  };
}

function versionState(current: ReleaseMetadata, latest: ReleaseMetadata): VersionState {
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

function decide(overrides: Partial<PolicyInput>, state: VersionState, now = 0) {
  return decideUpdatePolicyForState({ ...baseInput, ...overrides }, state, now);
}

test("update policy decisions stay copy-pasteable", () => {
  const releaseA = release("release-a");
  const releaseBRecommended = release("release-b", "recommended");
  const releaseBRequired = release("release-b", "required");
  const incompatibleApi = release("release-b", "required", "2026-07");

  expect(decide({}, versionState(releaseA, releaseA))).toMatchObject({
    decision: "passive-toast",
    blocksMutation: false,
    copy: "No update is pending for this session."
  });

  expect(decide({ mutationPending: true }, versionState(releaseA, releaseBRecommended))).toMatchObject({
    decision: "force-refresh-after-current-action",
    blocksMutation: false,
    blocksNavigation: true
  });

  expect(decide({ dirtyForm: true, sensitiveWorkflow: true }, versionState(releaseA, releaseBRequired))).toMatchObject({
    decision: "block-next-sensitive-mutation",
    blocksMutation: true,
    blocksNavigation: true
  });

  expect(decide({}, versionState(releaseA, releaseBRequired), 120_000)).toMatchObject({
    decision: "silent-reload-if-idle",
    blocksMutation: true,
    blocksNavigation: true
  });

  expect(decide({}, versionState(releaseA, incompatibleApi))).toMatchObject({
    decision: "allow-readonly-mode",
    blocksMutation: true,
    readonlyMode: true
  });

  expect(decide({ chunkFailureAlreadyHappened: true }, versionState(releaseA, releaseBRequired))).toMatchObject({
    decision: "show-chunk-failure-fallback",
    blocksMutation: true
  });
});
