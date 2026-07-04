import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CheckCircle2, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../shared/api";
import { recordAuditEvent } from "../shared/auditLogClient";
import { cx } from "../shared/format";
import { getOrCreateIdempotencyKey, peekIdempotencyKey } from "../shared/idempotencyKeyStore";
import { getSessionSnapshot } from "../shared/sessionSimulation";
import { guardSensitiveMutation, handleBlockedMutationGuard } from "../shared/sensitiveMutationGuard";
import { readJson } from "../shared/storage";
import { trackTelemetry } from "../shared/telemetry";
import type { RouterMode, SensitiveMutationIntent, WorkflowDraft, WorkflowType } from "../shared/types";
import { clearWorkflowDraft, restoreWorkflowDraft, saveWorkflowDraft } from "../shared/workflowDraftStore";
import {
  DuplicateSubmitPreventedNotice,
  LazyBoundaryDebugBadge,
  RequiredUpdateGate,
  SensitiveActionBlockedDialog,
  WorkflowAutosaveRestoredNotice
} from "../components/UpdateSurfaces";
import { preloadWorkflowChunks } from "../shared/preloadWorkflowChunks";

export type SaveRefreshStep = "write" | "check" | "submit" | "done";

const saveTextExample = {
  draftId: "save-text",
  intent: "draft.submit",
  workflowType: "draft"
} as const;

interface SaveRefreshDraft {
  memo: string;
  resultId?: string;
}

const steps = ["write", "check", "submit", "done"] as const satisfies readonly SaveRefreshStep[];
type VisibleSaveRefreshStep = (typeof steps)[number];
const stepLabels: Record<VisibleSaveRefreshStep, string> = {
  write: "Write",
  check: "Saved",
  submit: "Submit",
  done: "Done"
};

const defaultDraft: SaveRefreshDraft = {
  memo: "Saved memo"
};

function blockSaveRefreshActionIfNeeded({
  fallback,
  idempotencyKeyPresent,
  intent,
  lastInteractionAt,
  mutationPending,
  onBlocked,
  onRequiredUpdate,
  routerMode,
  workflowType
}: {
  fallback: string;
  idempotencyKeyPresent: boolean;
  intent: SensitiveMutationIntent;
  lastInteractionAt: number;
  mutationPending: boolean;
  onBlocked: (message: string) => void;
  onRequiredUpdate: (message: string | null) => void;
  routerMode: RouterMode;
  workflowType: WorkflowType;
}) {
  const guard = guardSensitiveMutation({
    routerMode,
    intent,
    workflowType,
    currentRoute: window.location.pathname,
    dirtyForm: true,
    mutationPending,
    challengePending: false,
    idempotencyKeyPresent,
    lastInteractionAt
  });
  return handleBlockedMutationGuard(guard, fallback, onRequiredUpdate, onBlocked);
}

function blockSaveRefreshSubmitIfNeeded({
  idempotencyKey,
  lastInteractionAt,
  mutationPending,
  onBlocked,
  onRequiredUpdate,
  routerMode
}: {
  idempotencyKey: string;
  lastInteractionAt: number;
  mutationPending: boolean;
  onBlocked: (message: string) => void;
  onRequiredUpdate: (message: string | null) => void;
  routerMode: RouterMode;
}) {
  void recordAuditEvent(routerMode, "draft_submit.attempted", "User attempted to submit the save-text example.", {
    idempotencyKeyPresent: Boolean(idempotencyKey)
  }, saveTextExample.workflowType);
  return blockSaveRefreshActionIfNeeded({
    fallback: "This action is paused.",
    idempotencyKeyPresent: Boolean(peekIdempotencyKey(saveTextExample.intent, saveTextExample.draftId)),
    intent: saveTextExample.intent,
    lastInteractionAt,
    mutationPending,
    onBlocked,
    onRequiredUpdate,
    routerMode,
    workflowType: saveTextExample.workflowType
  });
}

function visibleStep(step: SaveRefreshStep): VisibleSaveRefreshStep {
  return steps.includes(step as VisibleSaveRefreshStep) ? (step as VisibleSaveRefreshStep) : "check";
}

function useSaveRefreshDraft({
  idempotencyKey,
  routeBase,
  routerMode,
  session,
  step
}: {
  idempotencyKey: string;
  routeBase: string;
  routerMode: RouterMode;
  session: ReturnType<typeof getSessionSnapshot>;
  step: SaveRefreshStep;
}) {
  const restoredDraftSnapshot = useMemo(() => readJson<WorkflowDraft<SaveRefreshDraft> | null>(`draft:${saveTextExample.draftId}`, null), []);
  const [draft, setDraft] = useState<SaveRefreshDraft>(() =>
    restoredDraftSnapshot?.schemaVersion === 2 ? { ...defaultDraft, ...restoredDraftSnapshot.formValues } : defaultDraft
  );
  const [restored] = useState(Boolean(restoredDraftSnapshot?.schemaVersion === 2));
  const [lastInteractionAt, setLastInteractionAt] = useState(Date.now());

  function persistDraft(nextDraft: SaveRefreshDraft, nextStep: SaveRefreshStep) {
    saveWorkflowDraft({
      id: saveTextExample.draftId,
      workflowType: saveTextExample.workflowType,
      routerMode,
      currentPath: `${routeBase}/${nextStep}`,
      formValues: nextDraft,
      currentStep: nextStep,
      userId: session.user.id,
      organizationId: session.organization.id,
      idempotencyKey,
      mutationIntent: saveTextExample.intent
    });
  }

  useEffect(() => {
    if (restored) {
      restoreWorkflowDraft<SaveRefreshDraft>(saveTextExample.draftId, routerMode);
    }
  }, [restored, routerMode]);

  useEffect(() => {
    persistDraft(draft, step);
  }, [draft, idempotencyKey, routerMode, session.organization.id, session.user.id, step]);

  function updateDraft(next: Partial<SaveRefreshDraft>) {
    setLastInteractionAt(Date.now());
    const nextDraft = { ...draft, ...next };
    setDraft(nextDraft);
    persistDraft(nextDraft, step);
  }

  return { draft, lastInteractionAt, restored, setDraft, updateDraft };
}

export function SaveRefreshWorkflow({
  routerMode,
  routeBase = "/draft",
  step,
  navigateStep
}: {
  routerMode: RouterMode;
  routeBase?: string;
  step: SaveRefreshStep;
  navigateStep: (step: SaveRefreshStep) => void;
}) {
  const queryClient = useQueryClient();
  const session = getSessionSnapshot();
  const [deduped, setDeduped] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [requiredGateMessage, setRequiredGateMessage] = useState<string | null>(null);
  const idempotencyKey = useMemo(() => getOrCreateIdempotencyKey(saveTextExample.intent, saveTextExample.draftId), []);
  const { draft, lastInteractionAt, restored, setDraft, updateDraft } = useSaveRefreshDraft({
    idempotencyKey,
    routeBase,
    routerMode,
    session,
    step
  });
  const activeStep = visibleStep(step);

  useEffect(() => {
    void preloadWorkflowChunks(saveTextExample.workflowType, routerMode);
  }, [routerMode]);

  useEffect(() => {
    if (step === "check") {
      void recordAuditEvent(routerMode, "draft_check.viewed", "User viewed saved text.", {
        idempotencyKeyPresent: Boolean(idempotencyKey)
      }, saveTextExample.workflowType);
    }
  }, [idempotencyKey, routerMode, step]);

  const submitMutation = useMutation({
    mutationFn: () =>
      api.submitDraftAction(routerMode, idempotencyKey, draft),
    meta: { sensitive: true, intent: saveTextExample.intent },
    onMutate() {
      trackTelemetry("draft_submit_started", routerMode, { idempotencyKeyPresent: Boolean(idempotencyKey) }, saveTextExample.workflowType);
    },
    onSuccess(response) {
      setDeduped(response.deduped);
      setDraft((value) => ({ ...value, resultId: response.result.id }));
      queryClient.invalidateQueries({ queryKey: ["draft-action", routerMode] });
      trackTelemetry(response.deduped ? "draft_submit_deduped" : "draft_submit_succeeded", routerMode, {
        resultId: response.result.id,
        idempotencyKeyPresent: true
      }, saveTextExample.workflowType);
      clearWorkflowDraft(saveTextExample.draftId);
      navigateStep("done");
    }
  });

  function nextStep() {
    const index = steps.indexOf(activeStep);
    navigateStep(steps[Math.min(steps.length - 1, index + 1)]);
  }

  function previousStep() {
    const index = steps.indexOf(activeStep);
    navigateStep(steps[Math.max(0, index - 1)]);
  }

  function submitAction() {
    if (blockSaveRefreshSubmitIfNeeded({
      idempotencyKey,
      lastInteractionAt,
      mutationPending: submitMutation.isPending,
      onBlocked: setBlockedMessage,
      onRequiredUpdate: setRequiredGateMessage,
      routerMode
    })) {
      return;
    }
    submitMutation.mutate();
  }

  return (
    <div className="page-stack workflow-page" data-testid="draft-example">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Interactive example</p>
          <h1>Example 2: save before refresh</h1>
        </div>
        <LazyBoundaryDebugBadge label={step === "check" ? "lazy check route" : "saved draft route"} />
      </section>

      {restored ? <WorkflowAutosaveRestoredNotice /> : null}
      {requiredGateMessage ? (
        <RequiredUpdateGate routerMode={routerMode} message={requiredGateMessage} onRefresh={() => setRequiredGateMessage(null)} />
      ) : null}
      <DuplicateSubmitPreventedNotice visible={deduped} />

      <div className="stepper simple-stepper" aria-label="Save text steps">
        {steps.map((item) => (
          <button
            key={item}
            type="button"
            className={cx("step", item === activeStep && "active")}
            onClick={() => navigateStep(item)}
            disabled={submitMutation.isPending}
          >
            {stepLabels[item]}
          </button>
        ))}
      </div>

      <section className="workflow-surface">
        {activeStep === "write" ? (
          <div className="form-grid">
            <label>
              Main text
              <input value={draft.memo} onChange={(event) => updateDraft({ memo: event.target.value })} />
            </label>
          </div>
        ) : null}

        {activeStep === "check" ? (
          <div className="simple-proof-panel">
            <span>Saved text</span>
            <strong>{draft.memo || "Empty text"}</strong>
            <p>Refresh can happen now because the text and retry key are saved.</p>
          </div>
        ) : null}

        {activeStep === "submit" ? (
          <div className="simple-proof-panel">
            <span>Protected action</span>
            <strong>Try submit</strong>
            <p>If this tab is too old, submit is blocked and the saved text is restored after refresh.</p>
          </div>
        ) : null}

        {activeStep === "done" ? (
          <div className="receipt-panel" data-testid="draft-result">
            <CheckCircle2 aria-hidden="true" />
            <h2>Action submitted</h2>
            <p>{draft.resultId ? `Result ${draft.resultId}` : "The protected action result is ready."}</p>
          </div>
        ) : null}

        <footer className="workflow-actions">
          <button className="button button-secondary" type="button" onClick={previousStep} disabled={activeStep === "write" || submitMutation.isPending}>
            <ArrowLeft aria-hidden="true" />
            Back
          </button>
          <span className="autosave-chip">
            <Save aria-hidden="true" />
            Autosaved
          </span>
          {activeStep === "submit" ? (
            <button className="button" type="button" onClick={submitAction} disabled={submitMutation.isPending}>
              {submitMutation.isPending ? "Submitting..." : "Submit action"}
            </button>
          ) : activeStep === "done" ? null : (
            <button className="button" type="button" onClick={nextStep}>
              Continue
              <ArrowRight aria-hidden="true" />
            </button>
          )}
        </footer>
      </section>

      {blockedMessage ? <SensitiveActionBlockedDialog message={blockedMessage} onClose={() => setBlockedMessage(null)} /> : null}
    </div>
  );
}
