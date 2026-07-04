import { getCurrentReleaseIdentity } from "./releaseIdentity";
import { recordAuditEvent } from "./auditLogClient";
import { readJson, removeKey, writeJson } from "./storage";
import { trackTelemetry } from "./telemetry";
import type { RouterMode, SensitiveMutationIntent, WorkflowDraft, WorkflowType } from "./types";

const supportedSchemaVersion = 2;
const oldDraftExample = {
  draftId: "old-draft",
  workflowType: "old-draft",
  intent: "draft.submit"
} as const;

export interface SaveDraftInput<T> {
  id: string;
  workflowType: WorkflowType;
  routerMode: RouterMode;
  currentPath: string;
  formValues: T;
  currentStep: string;
  userId: string;
  organizationId: string;
  idempotencyKey?: string;
  mutationIntent?: SensitiveMutationIntent;
  schemaVersion?: number;
}

function key(id: string) {
  return `draft:${id}`;
}

export function saveWorkflowDraft<T>(input: SaveDraftInput<T>) {
  const release = getCurrentReleaseIdentity(input.routerMode);
  const draft: WorkflowDraft<T> = {
    id: input.id,
    workflowType: input.workflowType,
    schemaVersion: input.schemaVersion ?? supportedSchemaVersion,
    releaseId: release.releaseId,
    routerMode: input.routerMode,
    currentPath: input.currentPath,
    timestamp: new Date().toISOString(),
    formValues: input.formValues,
    currentStep: input.currentStep,
    userId: input.userId,
    organizationId: input.organizationId,
    idempotencyKey: input.idempotencyKey,
    mutationIntent: input.mutationIntent,
    compatibility: {
      apiContractVersion: release.apiContractVersion,
      featureFlagSnapshotVersion: release.featureFlagSnapshotVersion,
      minimumSupportedClientRelease: release.minimumSupportedClientRelease
    }
  };
  writeJson(key(input.id), draft);
  trackTelemetry("workflow_draft_saved", input.routerMode, {
    workflowType: input.workflowType,
    currentStep: input.currentStep,
    idempotencyKeyPresent: Boolean(input.idempotencyKey)
  }, input.workflowType);
  return draft;
}

export type DraftRestoreResult<T> =
  | { status: "missing" }
  | { status: "restored"; draft: WorkflowDraft<T>; migrated: boolean }
  | { status: "incompatible"; draft: WorkflowDraft<T>; reason: string };

function restoredDraft<T>(routerMode: RouterMode, draft: WorkflowDraft<T>, migrated: boolean, fromSchemaVersion?: number): DraftRestoreResult<T> {
  trackTelemetry("workflow_draft_restored", routerMode, { workflowType: draft.workflowType, migrated }, draft.workflowType);
  void recordAuditEvent(
    routerMode,
    "workflow_draft.restored",
    migrated ? "Draft restored after app update and migrated." : "Draft restored after app update.",
    {
      workflowType: draft.workflowType,
      migrated,
      ...(fromSchemaVersion ? { fromSchemaVersion } : {})
    },
    draft.workflowType
  );
  return { status: "restored", draft, migrated };
}

function migrateOldDraftExample<T>(draft: WorkflowDraft<T>) {
  if (draft.schemaVersion !== 1 || draft.workflowType !== oldDraftExample.workflowType) {
    return null;
  }
  return {
    ...draft,
    schemaVersion: supportedSchemaVersion,
    formValues: {
      ...(draft.formValues as Record<string, unknown>),
      migrationReviewRequired: true,
      migratedFromSchemaVersion: 1
    }
  } as WorkflowDraft<T>;
}

function incompatibleDraft<T>(routerMode: RouterMode, draft: WorkflowDraft<T>): DraftRestoreResult<T> {
  void recordAuditEvent(
    routerMode,
    "workflow_draft.incompatible",
    "Draft schema was incompatible and required a check.",
    {
      workflowType: draft.workflowType,
      schemaVersion: draft.schemaVersion
    },
    draft.workflowType
  );
  return {
    status: "incompatible",
    draft,
    reason: `Draft schema ${draft.schemaVersion} is not compatible with schema ${supportedSchemaVersion}.`
  };
}

export function restoreWorkflowDraft<T>(id: string, routerMode: RouterMode): DraftRestoreResult<T> {
  const draft = readJson<WorkflowDraft<T> | null>(key(id), null);
  if (!draft) {
    return { status: "missing" };
  }
  if (draft.schemaVersion === supportedSchemaVersion) {
    return restoredDraft(routerMode, draft, false);
  }
  const migrated = migrateOldDraftExample(draft);
  if (migrated) {
    writeJson(key(id), migrated);
    return restoredDraft(routerMode, migrated, true, draft.schemaVersion);
  }
  return incompatibleDraft(routerMode, draft);
}

export function clearWorkflowDraft(id: string) {
  removeKey(key(id));
}

export function seedOldDraftExample(routerMode: RouterMode) {
  saveWorkflowDraft({
    id: oldDraftExample.draftId,
    workflowType: oldDraftExample.workflowType,
    routerMode,
    currentPath: "/bad-draft/check",
    currentStep: "check",
    userId: "usr_example",
    organizationId: "org_example",
    formValues: {
      note: "Legacy saved note",
      migrationReviewRequired: true
    },
    schemaVersion: 99,
    mutationIntent: oldDraftExample.intent
  });
}
