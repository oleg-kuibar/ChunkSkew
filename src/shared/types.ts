export type RouterMode = "react-router" | "tanstack-router";
export type UpdateSeverity = "optional" | "recommended" | "required";
export type UpdateDecision =
  | "silent-reload-if-idle"
  | "passive-toast"
  | "sticky-banner"
  | "defer-until-save"
  | "block-new-navigation"
  | "block-next-sensitive-mutation"
  | "force-refresh-after-current-action"
  | "show-chunk-failure-fallback"
  | "allow-current-step-only"
  | "allow-readonly-mode";
export type WorkflowType = "draft" | "old-draft" | "event" | "guarded" | "extra" | "none";

export const workflowTypeLabels: Record<WorkflowType, string> = {
  draft: "Save-refresh",
  "old-draft": "Old draft",
  event: "Lazy drawer",
  guarded: "Guarded action",
  extra: "Extra draft",
  none: "General"
};
export type SensitiveMutationIntent =
  | "draft.submit"
  | "role.change"
  | "api-key.generate";

export interface ReleaseMetadata {
  releaseId: string;
  buildTime: string;
  gitSha?: string;
  deploymentId: string;
  minimumSupportedClientRelease: string;
  updateSeverity: UpdateSeverity;
  routerMode: RouterMode;
  assetBasePath: string;
  compatibilityWindowExpiresAt: string;
  featureFlagSnapshotVersion: string;
  apiContractVersion: string;
  draftSchemaVersions: Record<string, number>;
  skewMode?: SkewMode;
}

export type SkewMode =
  | "no-affinity"
  | "affinity"
  | "asset-retention"
  | "broken"
  | "compatibility-window-expired"
  | "api-contract-incompatible";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "reviewer" | "employee" | "auditor";
  challengeEnabled: boolean;
}

export interface Organization {
  id: string;
  name: string;
  fakeDataNotice: string;
}

export interface SessionSnapshot {
  authenticated: boolean;
  user: SessionUser;
  organization: Organization;
  permissions: string[];
  challengeRequiredForSensitiveActions: boolean;
  expiresAt: string;
}

export interface TelemetryEvent {
  id: string;
  name: TelemetryEventName;
  createdAt: string;
  releaseId: string;
  routerMode: RouterMode;
  workflowType?: WorkflowType;
  properties: Record<string, unknown>;
}

export type TelemetryEventName =
  | "version_check_started"
  | "version_check_succeeded"
  | "version_check_failed"
  | "release_available_detected"
  | "release_required_detected"
  | "release_rollback_detected"
  | "update_toast_shown"
  | "update_banner_shown"
  | "update_refresh_clicked"
  | "update_refresh_deferred"
  | "chunk_load_failed"
  | "chunk_reload_attempted"
  | "chunk_reload_loop_prevented"
  | "workflow_draft_saved"
  | "workflow_draft_restored"
  | "draft_submit_started"
  | "draft_submit_succeeded"
  | "draft_submit_deduped"
  | "draft_submit_blocked_required_update"
  | "old_draft_submit_blocked_required_update"
  | "mutation_deferred_due_to_pending_update"
  | "route_preload_started"
  | "route_preload_succeeded"
  | "route_preload_failed"
  | "tanstack_lazy_route_failed"
  | "react_router_lazy_route_failed"
  | "asset_retention_used"
  | "deployment_affinity_used"
  | "api_contract_incompatible_detected"
  | "asset_retention_expiring_detected"
  | "api_contract_deprecating_detected";

export interface WorkflowDraft<T = unknown> {
  id: string;
  workflowType: WorkflowType;
  schemaVersion: number;
  releaseId: string;
  routerMode: RouterMode;
  currentPath: string;
  timestamp: string;
  formValues: T;
  currentStep: string;
  userId: string;
  organizationId: string;
  idempotencyKey?: string;
  mutationIntent?: SensitiveMutationIntent;
  compatibility: {
    apiContractVersion: string;
    featureFlagSnapshotVersion: string;
    minimumSupportedClientRelease: string;
  };
}

export interface MutationEnvelope<TBody = unknown> {
  body: TBody;
  idempotencyKey: string;
  clientReleaseId: string;
  deploymentId: string;
  routerMode: RouterMode;
  userId: string;
  organizationId: string;
  mutationIntent: SensitiveMutationIntent;
  createdAt: string;
}

export interface AuditEvent {
  id: string;
  type: string;
  message: string;
  actorId: string;
  organizationId: string;
  releaseId: string;
  deploymentId: string;
  routerMode: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}

export interface PreloadStatus {
  route: string;
  workflowType: WorkflowType;
  lazyMechanism: "react-router-lazy" | "tanstack-route-lazy" | "component-lazy";
  status: "idle" | "started" | "succeeded" | "failed";
  lastPreloadError?: string;
  releaseId: string;
  requiredToFinishWorkflow: boolean;
}
