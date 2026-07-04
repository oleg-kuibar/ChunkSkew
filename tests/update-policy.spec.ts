import { expect, test } from "@playwright/test";
import { decideUpdatePolicyForState, type PolicyInput } from "../src/shared/updatePolicyEngine";
import type { VersionState } from "../src/shared/versionCheckClient";
import { testRelease, versionState } from "./release-fixtures";

const routerMode = "react-router";

const baseInput: PolicyInput = {
  routerMode,
  currentRoute: "/draft/check",
  workflowType: "none",
  routeIsLazyLoaded: true,
  dirtyForm: false,
  mutationPending: false,
  navigationPending: false,
  challengePending: false,
  idempotencyKeyPresent: true,
  lastInteractionAt: 0,
  sensitiveWorkflow: false,
  requiredWorkflowChunksPreloaded: true,
  oldAssetRetentionActive: false,
  deploymentAffinityActive: false,
  apiContractCompatible: true
};

function decide(overrides: Partial<PolicyInput>, state: VersionState, now = 0) {
  return decideUpdatePolicyForState({ ...baseInput, ...overrides }, state, now);
}

test("update policy decisions stay copy-pasteable", () => {
  const releaseA = testRelease("release-a");
  const releaseBRecommended = testRelease("release-b", { updateSeverity: "recommended" });
  const releaseBRequired = testRelease("release-b", { updateSeverity: "required" });
  const incompatibleApi = testRelease("release-b", { apiContractVersion: "2026-07", updateSeverity: "required" });
  const decisions = new Set<string>();

  const cleanSession = decide({}, versionState(releaseA, releaseA));
  decisions.add(cleanSession.decision);
  expect(cleanSession).toMatchObject({
    decision: "passive-toast",
    blocksMutation: false,
    copy: "No update is pending for this session."
  });

  const pendingMutation = decide({ mutationPending: true }, versionState(releaseA, releaseBRecommended));
  decisions.add(pendingMutation.decision);
  expect(pendingMutation).toMatchObject({
    decision: "force-refresh-after-current-action",
    blocksMutation: false,
    blocksNavigation: true
  });

  const blockedSensitiveMutation = decide({ dirtyForm: true, sensitiveWorkflow: true }, versionState(releaseA, releaseBRequired));
  decisions.add(blockedSensitiveMutation.decision);
  expect(blockedSensitiveMutation).toMatchObject({
    decision: "block-next-sensitive-mutation",
    blocksMutation: true,
    blocksNavigation: true
  });

  const idleRequiredUpdate = decide({ requiredWorkflowChunksPreloaded: false }, versionState(releaseA, releaseBRequired), 120_000);
  decisions.add(idleRequiredUpdate.decision);
  expect(idleRequiredUpdate).toMatchObject({
    decision: "silent-reload-if-idle",
    blocksMutation: true,
    blocksNavigation: true
  });

  const readonly = decide({}, versionState(releaseA, incompatibleApi));
  decisions.add(readonly.decision);
  expect(readonly).toMatchObject({
    decision: "allow-readonly-mode",
    blocksMutation: true,
    readonlyMode: true
  });

  const chunkFallback = decide({ chunkFailureAlreadyHappened: true }, versionState(releaseA, releaseBRequired));
  decisions.add(chunkFallback.decision);
  expect(chunkFallback).toMatchObject({
    decision: "show-chunk-failure-fallback",
    blocksMutation: true
  });

  const currentStepOnly = decide({ sensitiveWorkflow: true }, versionState(releaseA, releaseBRequired));
  decisions.add(currentStepOnly.decision);
  expect(currentStepOnly).toMatchObject({
    decision: "allow-current-step-only",
    blocksMutation: true,
    blocksNavigation: true
  });

  const requiredNavigationBlock = decide(
    { requiredWorkflowChunksPreloaded: false },
    versionState(releaseA, releaseBRequired)
  );
  decisions.add(requiredNavigationBlock.decision);
  expect(requiredNavigationBlock).toMatchObject({
    decision: "block-new-navigation",
    blocksMutation: true,
    blocksNavigation: true
  });

  const recommendedWorkflow = decide({ sensitiveWorkflow: true }, versionState(releaseA, releaseBRecommended));
  decisions.add(recommendedWorkflow.decision);
  expect(recommendedWorkflow).toMatchObject({
    decision: "sticky-banner",
    blocksMutation: false
  });

  const dirtyRecommendedWorkflow = decide(
    { dirtyForm: true, sensitiveWorkflow: true },
    versionState(releaseA, releaseBRecommended)
  );
  decisions.add(dirtyRecommendedWorkflow.decision);
  expect(dirtyRecommendedWorkflow).toMatchObject({
    decision: "defer-until-save",
    blocksMutation: false
  });

  expect([...decisions].sort()).toEqual([
    "allow-current-step-only",
    "allow-readonly-mode",
    "block-new-navigation",
    "block-next-sensitive-mutation",
    "defer-until-save",
    "force-refresh-after-current-action",
    "passive-toast",
    "show-chunk-failure-fallback",
    "silent-reload-if-idle",
    "sticky-banner"
  ]);
});
