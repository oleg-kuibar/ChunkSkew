import { can, permissionDeniedMessage } from "./permissionModel";
import { recordAuditEvent } from "./auditLogClient";
import { getSessionSnapshot } from "./sessionSimulation";
import { trackTelemetry } from "./telemetry";
import { decideUpdatePolicy } from "./updatePolicyEngine";
import type { RouterMode, SensitiveMutationIntent, WorkflowType } from "./types";

const permissionByIntent: Record<SensitiveMutationIntent, string> = {
  "payment.submit": "payments:create",
  "invoice.approve": "invoices:approve",
  "invoice.reject": "invoices:approve",
  "card.freeze": "cards:update",
  "card.unfreeze": "cards:update",
  "card.limit.update": "cards:update",
  "kyb.submit": "kyb:submit",
  "vendor.create": "payments:create",
  "role.change": "admin:write",
  "api-key.generate": "api-keys:create"
};

export interface GuardInput {
  routerMode: RouterMode;
  intent: SensitiveMutationIntent;
  workflowType: WorkflowType;
  currentRoute: string;
  dirtyForm: boolean;
  mutationPending: boolean;
  mfaPending: boolean;
  idempotencyKeyPresent: boolean;
  lastInteractionAt: number;
}

export interface GuardResult {
  allowed: boolean;
  reason?: string;
  policyCopy?: string;
  code?: "required-update" | "permission-denied" | "session-expired";
}

export function guardSensitiveMutation(input: GuardInput): GuardResult {
  const session = getSessionSnapshot();
  if (!session.authenticated) {
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

  const permission = permissionByIntent[input.intent];
  if (!can(permission)) {
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

  const policy = decideUpdatePolicy({
    routerMode: input.routerMode,
    currentRoute: input.currentRoute,
    workflowType: input.workflowType,
    routeIsLazyLoaded: true,
    dirtyForm: input.dirtyForm,
    mutationPending: input.mutationPending,
    navigationPending: false,
    mfaPending: input.mfaPending,
    idempotencyKeyPresent: input.idempotencyKeyPresent,
    lastInteractionAt: input.lastInteractionAt,
    sensitiveWorkflow: input.workflowType !== "none",
    requiredWorkflowChunksPreloaded: true,
    oldAssetRetentionActive: false,
    deploymentAffinityActive: false,
    apiContractCompatible: true
  });

  if (policy.blocksMutation) {
    const telemetryByWorkflow = {
      payment: "payment_submit_blocked_required_update",
      invoice: "invoice_approval_blocked_required_update",
      card: "card_update_blocked_required_update",
      kyb: "kyb_submit_blocked_required_update"
    } as const;
    const eventName = telemetryByWorkflow[input.workflowType as keyof typeof telemetryByWorkflow];
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

  return { allowed: true };
}
