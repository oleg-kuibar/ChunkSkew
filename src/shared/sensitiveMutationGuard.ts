import { can, permissionDeniedMessage } from "./permissionModel";
import { recordAuditEvent } from "./auditLogClient";
import { getSessionSnapshot } from "./sessionSimulation";
import { trackTelemetry } from "./telemetry";
import { decideUpdatePolicy } from "./updatePolicyEngine";
import type { RouterMode, SensitiveMutationIntent, TelemetryEventName, WorkflowType } from "./types";

const permissionByIntent: Record<SensitiveMutationIntent, string> = {
  "draft.submit": "protected:create",
  "role.change": "admin:write",
  "api-key.generate": "api-keys:create"
};

const requiredUpdateTelemetryByWorkflow: Partial<Record<WorkflowType, TelemetryEventName>> = {
  draft: "draft_submit_blocked_required_update",
  "old-draft": "old_draft_submit_blocked_required_update"
};

export interface GuardInput {
  routerMode: RouterMode;
  intent: SensitiveMutationIntent;
  workflowType: WorkflowType;
  currentRoute: string;
  dirtyForm: boolean;
  mutationPending: boolean;
  challengePending: boolean;
  idempotencyKeyPresent: boolean;
  lastInteractionAt: number;
}

export interface GuardResult {
  allowed: boolean;
  reason?: string;
  policyCopy?: string;
  code?: "required-update" | "permission-denied" | "session-expired";
}

function sessionExpiredResult(input: GuardInput): GuardResult {
  void recordAuditEvent(input.routerMode, "mutation.blocked.session_expired", "A sensitive action was blocked because the session expired.", {
    intent: input.intent,
    workflowType: input.workflowType
  }, input.workflowType);
  return {
    allowed: false,
    code: "session-expired",
    reason: "Your session expired. Re-authenticate before continuing."
  };
}

function permissionDeniedResult(input: GuardInput, permission: string): GuardResult {
  void recordAuditEvent(input.routerMode, "mutation.blocked.permission_denied", "A sensitive action was blocked by permission policy.", {
    intent: input.intent,
    permission
  }, input.workflowType);
  return {
    allowed: false,
    code: "permission-denied",
    reason: permissionDeniedMessage(permission)
  };
}

function requiredUpdateResult(input: GuardInput, policy: ReturnType<typeof decideUpdatePolicy>): GuardResult {
  const eventName = requiredUpdateTelemetryByWorkflow[input.workflowType];
  if (eventName) {
    trackTelemetry(eventName, input.routerMode, { intent: input.intent }, input.workflowType);
  }
  void recordAuditEvent(input.routerMode, "update_required.blocked_mutation", "A required update blocked a sensitive mutation.", {
    intent: input.intent,
    decision: policy.decision
  }, input.workflowType);
  return {
    allowed: false,
    code: "required-update",
    reason: policy.copy,
    policyCopy: policy.copy
  };
}

function updatePolicyForMutation(input: GuardInput) {
  return decideUpdatePolicy({
    routerMode: input.routerMode,
    currentRoute: input.currentRoute,
    workflowType: input.workflowType,
    routeIsLazyLoaded: true,
    dirtyForm: input.dirtyForm,
    mutationPending: input.mutationPending,
    navigationPending: false,
    challengePending: input.challengePending,
    idempotencyKeyPresent: input.idempotencyKeyPresent,
    lastInteractionAt: input.lastInteractionAt,
    sensitiveWorkflow: input.workflowType !== "none",
    requiredWorkflowChunksPreloaded: true,
    oldAssetRetentionActive: false,
    deploymentAffinityActive: false,
    apiContractCompatible: true
  });
}

export function handleBlockedMutationGuard(
  guard: GuardResult,
  fallback: string,
  onRequiredUpdate: (message: string | null) => void,
  onBlocked: (message: string) => void
) {
  if (guard.allowed) {
    return false;
  }
  if (guard.code === "required-update") {
    onRequiredUpdate(guard.reason ?? null);
  } else {
    onBlocked(guard.reason ?? fallback);
  }
  return true;
}

export function guardSensitiveMutation(input: GuardInput): GuardResult {
  const session = getSessionSnapshot();
  if (!session.authenticated) {
    return sessionExpiredResult(input);
  }

  const permission = permissionByIntent[input.intent];
  if (!can(permission)) {
    return permissionDeniedResult(input, permission);
  }

  const policy = updatePolicyForMutation(input);
  if (policy.blocksMutation) {
    return requiredUpdateResult(input, policy);
  }

  return { allowed: true };
}
