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

export function decideUpdatePolicy(input: PolicyInput): PolicyResult {
  const versionState = getVersionState(input.routerMode);
  const idle = Date.now() - input.lastInteractionAt > 60_000;
  const clean = !input.dirtyForm && !input.mutationPending && !input.mfaPending && !input.navigationPending;

  if (input.chunkFailureAlreadyHappened) {
    return {
      decision: "show-chunk-failure-fallback",
      blocksMutation: true,
      blocksNavigation: false,
      readonlyMode: false,
      copy: "We saved your progress. Refresh safely to continue with the latest app version.",
      versionState
    };
  }

  if (!input.apiContractCompatible || !versionState.apiContractCompatible) {
    return {
      decision: "allow-readonly-mode",
      blocksMutation: true,
      blocksNavigation: false,
      readonlyMode: true,
      copy: "This session can still be reviewed, but changes are paused until the app is refreshed.",
      versionState
    };
  }

  if (!versionState.updateAvailable) {
    return {
      decision: "passive-toast",
      blocksMutation: false,
      blocksNavigation: false,
      readonlyMode: false,
      copy: "You are on the current release.",
      versionState
    };
  }

  if (input.mutationPending) {
    return {
      decision: "force-refresh-after-current-action",
      blocksMutation: false,
      blocksNavigation: true,
      readonlyMode: false,
      copy: "We will offer a refresh after the current action finishes.",
      versionState
    };
  }

  if (versionState.requiredUpdatePending) {
    if (input.dirtyForm || input.mfaPending || input.sensitiveWorkflow) {
      return {
        decision: "block-next-sensitive-mutation",
        blocksMutation: true,
        blocksNavigation: input.sensitiveWorkflow,
        readonlyMode: false,
        copy: "Your work is saved. Refresh before starting another sensitive action.",
        versionState
      };
    }

    return {
      decision: clean && idle ? "silent-reload-if-idle" : "block-new-navigation",
      blocksMutation: true,
      blocksNavigation: true,
      readonlyMode: false,
      copy: "A required update is ready. Refresh to continue making changes.",
      versionState
    };
  }

  if (versionState.updateSeverity === "recommended" && input.sensitiveWorkflow) {
    return {
      decision: input.dirtyForm ? "defer-until-save" : "sticky-banner",
      blocksMutation: false,
      blocksNavigation: false,
      readonlyMode: false,
      copy: "A safer app version is ready. Finish this step, then refresh at a safe point.",
      versionState
    };
  }

  if (clean && idle) {
    return {
      decision: "silent-reload-if-idle",
      blocksMutation: false,
      blocksNavigation: false,
      readonlyMode: false,
      copy: "Refreshing while the session is idle.",
      versionState
    };
  }

  return {
    decision: "passive-toast",
    blocksMutation: false,
    blocksNavigation: false,
    readonlyMode: false,
    copy: "A new app version is available. You can refresh when ready.",
    versionState
  };
}
