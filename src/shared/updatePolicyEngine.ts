import { getVersionState } from "./versionCheckClient";
import type { RouterMode, UpdateDecision, WorkflowType } from "./types";

type VersionMetadata = ReturnType<typeof getVersionState>;

export interface PolicyInput {
  routerMode: RouterMode;
  currentRoute: string;
  workflowType: WorkflowType;
  routeIsLazyLoaded: boolean;
  dirtyForm: boolean;
  mutationPending: boolean;
  navigationPending: boolean;
  mfaPending: boolean;
  idempotencyKeyPresent: boolean;
  lastInteractionAt: number;
  sensitiveWorkflow: boolean;
  requiredWorkflowChunksPreloaded: boolean;
  oldAssetRetentionActive: boolean;
  deploymentAffinityActive: boolean;
  apiContractCompatible: boolean;
  chunkFailureAlreadyHappened?: boolean;
}

export interface PolicyResult {
  decision: UpdateDecision;
  blocksMutation: boolean;
  blocksNavigation: boolean;
  readonlyMode: boolean;
  copy: string;
  versionState: VersionMetadata;
}

type PolicyResultFlags = Partial<Pick<PolicyResult, "blocksMutation" | "blocksNavigation" | "readonlyMode">>;

function policyResult(
  versionState: VersionMetadata,
  decision: UpdateDecision,
  copy: string,
  flags: PolicyResultFlags = {}
): PolicyResult {
  return {
    decision,
    blocksMutation: false,
    blocksNavigation: false,
    readonlyMode: false,
    copy,
    versionState,
    ...flags
  };
}

export function decideUpdatePolicy(input: PolicyInput): PolicyResult {
  const versionState = getVersionState(input.routerMode);
  return decideUpdatePolicyForState(input, versionState);
}

export function decideUpdatePolicyForState(input: PolicyInput, versionState: VersionMetadata, now = Date.now()): PolicyResult {
  const idle = now - input.lastInteractionAt > 60_000;
  const clean = !input.dirtyForm && !input.mutationPending && !input.mfaPending && !input.navigationPending;

  if (input.chunkFailureAlreadyHappened) {
    return policyResult(
      versionState,
      "show-chunk-failure-fallback",
      "We saved your progress. Refresh safely to continue with the latest app version.",
      { blocksMutation: true }
    );
  }

  if (!input.apiContractCompatible || !versionState.apiContractCompatible) {
    return policyResult(
      versionState,
      "allow-readonly-mode",
      "This session can still be reviewed, but changes are paused until the app is refreshed.",
      { blocksMutation: true, readonlyMode: true }
    );
  }

  if (!versionState.updateAvailable) {
    return policyResult(versionState, "passive-toast", "No update is pending for this session.");
  }

  if (input.mutationPending) {
    return policyResult(
      versionState,
      "force-refresh-after-current-action",
      "We will offer a refresh after the current action finishes.",
      { blocksNavigation: true }
    );
  }

  if (versionState.requiredUpdatePending) {
    if (input.sensitiveWorkflow && input.requiredWorkflowChunksPreloaded && !input.dirtyForm && !input.mfaPending) {
      return policyResult(
        versionState,
        "allow-current-step-only",
        "You can finish reviewing this step, but refresh before starting another sensitive action.",
        { blocksMutation: true, blocksNavigation: true }
      );
    }

    if (input.dirtyForm || input.mfaPending || input.sensitiveWorkflow) {
      return policyResult(
        versionState,
        "block-next-sensitive-mutation",
        "Your work is saved. Refresh before starting another sensitive action.",
        { blocksMutation: true, blocksNavigation: input.sensitiveWorkflow }
      );
    }

    return policyResult(
      versionState,
      clean && idle ? "silent-reload-if-idle" : "block-new-navigation",
      "A required update is ready. Refresh to continue making changes.",
      { blocksMutation: true, blocksNavigation: true }
    );
  }

  if (versionState.updateSeverity === "recommended" && input.sensitiveWorkflow) {
    return policyResult(
      versionState,
      input.dirtyForm ? "defer-until-save" : "sticky-banner",
      "A safer app version is ready. Finish this step, then refresh at a safe point."
    );
  }

  if (clean && idle) {
    return policyResult(versionState, "silent-reload-if-idle", "Refreshing while the session is idle.");
  }

  return policyResult(
    versionState,
    "passive-toast",
    "A new app version is available. You can refresh when ready."
  );
}
