import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CheckCircle2, FileWarning, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../shared/api";
import { getOrCreateIdempotencyKey } from "../shared/idempotencyKeyStore";
import { preloadWorkflowChunks } from "../shared/preloadWorkflowChunks";
import { getSessionSnapshot } from "../shared/sessionSimulation";
import { guardSensitiveMutation, handleBlockedMutationGuard } from "../shared/sensitiveMutationGuard";
import { readJson } from "../shared/storage";
import type { RouterMode, WorkflowDraft } from "../shared/types";
import { restoreWorkflowDraft, saveWorkflowDraft } from "../shared/workflowDraftStore";
import {
  DuplicateSubmitPreventedNotice,
  LazyBoundaryDebugBadge,
  RequiredUpdateGate,
  SensitiveActionBlockedDialog,
  WorkflowAutosaveRestoredNotice
} from "../components/UpdateSurfaces";
import { cx } from "../shared/format";

export type BadDraftStep = "note" | "check" | "done";

const oldDraftExample = {
  draftId: "old-draft",
  intent: "draft.submit",
  workflowType: "old-draft"
} as const;

interface BadDraft {
  note: string;
  migrationReviewRequired?: boolean;
}

const steps = ["note", "check", "done"] as const satisfies readonly BadDraftStep[];
type VisibleBadDraftStep = (typeof steps)[number];
const stepLabels: Record<VisibleBadDraftStep, string> = {
  note: "1. Write",
  check: "2. Check",
  done: "3. Done"
};

const defaultDraft: BadDraft = {
  note: "Short note used to prove draft recovery"
};

interface BadDraftState {
  draft: BadDraft;
  restored: boolean;
  migrated: boolean;
  incompatible: string | null;
  readyToSave: boolean;
}

function normalizeDraft(formValues?: Partial<BadDraft> & { address?: string }): BadDraft {
  return {
    ...defaultDraft,
    ...formValues,
    note: formValues?.note ?? formValues?.address ?? defaultDraft.note
  };
}

function incompatibleBadDraftReason(draft: WorkflowDraft<BadDraft> | null) {
  if (!draft || draft.schemaVersion === 1 || draft.schemaVersion === 2) {
    return null;
  }
  return `Draft schema ${draft.schemaVersion} is not compatible with schema 2.`;
}

function initialBadDraftState(restoredDraftSnapshot: WorkflowDraft<BadDraft> | null): BadDraftState {
  const currentSchema = restoredDraftSnapshot?.schemaVersion;
  const restoredFormValues = currentSchema === 2 ? restoredDraftSnapshot?.formValues : null;
  return {
    draft: normalizeDraft(restoredFormValues ?? undefined),
    restored: currentSchema === 2,
    migrated: false,
    incompatible: incompatibleBadDraftReason(restoredDraftSnapshot),
    readyToSave: !restoredDraftSnapshot || currentSchema === 2
  };
}

function restoreBadDraftState(routerMode: RouterMode): BadDraftState {
  const restoredDraft = restoreWorkflowDraft<BadDraft>(oldDraftExample.draftId, routerMode);
  if (restoredDraft.status === "restored") {
    return {
      draft: normalizeDraft(restoredDraft.draft.formValues),
      restored: true,
      migrated: restoredDraft.migrated,
      incompatible: null,
      readyToSave: true
    };
  }
  if (restoredDraft.status === "incompatible") {
    return {
      ...initialBadDraftState(null),
      incompatible: restoredDraft.reason,
      readyToSave: false
    };
  }
  return initialBadDraftState(null);
}

function canSaveBadDraft(state: BadDraftState) {
  return state.readyToSave && !state.incompatible;
}

function visibleStep(step: BadDraftStep): VisibleBadDraftStep {
  return steps.includes(step as VisibleBadDraftStep) ? (step as VisibleBadDraftStep) : "check";
}

function saveBadDraft({
  draft,
  idempotencyKey,
  organizationId,
  routeBase,
  routerMode,
  step,
  userId
}: {
  draft: BadDraft;
  idempotencyKey: string;
  organizationId: string;
  routeBase: string;
  routerMode: RouterMode;
  step: BadDraftStep;
  userId: string;
}) {
  saveWorkflowDraft({
    id: oldDraftExample.draftId,
    workflowType: oldDraftExample.workflowType,
    routerMode,
    currentPath: `${routeBase}/${step}`,
    currentStep: step,
    formValues: draft,
    userId,
    organizationId,
    idempotencyKey,
    mutationIntent: oldDraftExample.intent
  });
}

function saveBadDraftIfReady(
  state: BadDraftState,
  draft: BadDraft,
  step: BadDraftStep,
  {
    idempotencyKey,
    organizationId,
    routeBase,
    routerMode,
    userId
  }: {
    idempotencyKey: string;
    organizationId: string;
    routeBase: string;
    routerMode: RouterMode;
    userId: string;
  }
) {
  if (!canSaveBadDraft(state)) {
    return;
  }
  saveBadDraft({
    draft,
    idempotencyKey,
    organizationId,
    routeBase,
    routerMode,
    step,
    userId
  });
}

function useBadDraft({
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
  step: BadDraftStep;
}) {
  const restoredDraftSnapshot = useMemo(() => readJson<WorkflowDraft<BadDraft> | null>(`draft:${oldDraftExample.draftId}`, null), []);
  const [draftState, setDraftState] = useState<BadDraftState>(() => initialBadDraftState(restoredDraftSnapshot));

  useEffect(() => {
    setDraftState(restoreBadDraftState(routerMode));
  }, [routerMode]);

  useEffect(() => {
    saveBadDraftIfReady(draftState, draftState.draft, step, {
      idempotencyKey,
      organizationId: session.organization.id,
      routeBase,
      routerMode,
      userId: session.user.id
    });
  }, [draftState, idempotencyKey, routeBase, routerMode, session.organization.id, session.user.id, step]);

  function updateDraft(next: Partial<BadDraft>) {
    const merged = { ...draftState.draft, ...next };
    setDraftState((value) => ({ ...value, draft: merged }));
    saveBadDraftIfReady(draftState, merged, step, {
      idempotencyKey,
      organizationId: session.organization.id,
      routeBase,
      routerMode,
      userId: session.user.id
    });
  }

  return {
    draft: draftState.draft,
    incompatible: draftState.incompatible,
    migrated: draftState.migrated,
    restored: draftState.restored,
    setIncompatible: (message: string | null) => setDraftState((value) => ({ ...value, incompatible: message })),
    updateDraft
  };
}

export function BadDraftWorkflow({
  routerMode,
  routeBase = "/bad-draft",
  step,
  navigateStep
}: {
  routerMode: RouterMode;
  routeBase?: string;
  step: BadDraftStep;
  navigateStep: (step: BadDraftStep) => void;
}) {
  const session = getSessionSnapshot();
  const [blocked, setBlocked] = useState<string | null>(null);
  const [requiredGate, setRequiredGate] = useState<string | null>(null);
  const [deduped, setDeduped] = useState(false);
  const idempotencyKey = useMemo(() => getOrCreateIdempotencyKey(oldDraftExample.intent, oldDraftExample.draftId), []);
  const { draft, incompatible, migrated, restored, setIncompatible, updateDraft } = useBadDraft({
    idempotencyKey,
    routeBase,
    routerMode,
    session,
    step
  });
  const activeStep = visibleStep(step);

  useEffect(() => {
    void preloadWorkflowChunks(oldDraftExample.workflowType, routerMode);
  }, [routerMode]);

  const submitMutation = useMutation({
    mutationFn: () => api.submitDraftAction(routerMode, idempotencyKey, { memo: draft.note }),
    meta: { sensitive: true, intent: oldDraftExample.intent },
    onSuccess(response) {
      setDeduped(response.deduped);
      navigateStep("done");
    }
  });

  function submit() {
    const guard = guardSensitiveMutation({
      routerMode,
      intent: oldDraftExample.intent,
      workflowType: oldDraftExample.workflowType,
      currentRoute: window.location.pathname,
      dirtyForm: true,
      mutationPending: submitMutation.isPending,
      challengePending: false,
      idempotencyKeyPresent: Boolean(idempotencyKey),
      lastInteractionAt: Date.now()
    });
    if (handleBlockedMutationGuard(guard, "Draft submission is paused.", setRequiredGate, setBlocked)) {
      return;
    }
    submitMutation.mutate();
  }

  function nextStep() {
    navigateStep(steps[Math.min(steps.length - 1, steps.indexOf(activeStep) + 1)]);
  }

  function previousStep() {
    navigateStep(steps[Math.max(0, steps.indexOf(activeStep) - 1)]);
  }

  if (incompatible) {
    return (
      <section className="fallback-panel" data-testid="incompatible-draft-fallback">
        <div className="fallback-icon">
          <FileWarning aria-hidden="true" />
        </div>
        <div className="fallback-body">
          <h2>Draft needs checking</h2>
          <p>{incompatible} Open a fresh draft and check the saved note before submitting.</p>
          <button className="button" type="button" onClick={() => setIncompatible(null)}>
            Continue with fresh draft
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="page-stack workflow-page" data-testid="bad-draft-workflow">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Interactive example</p>
          <h1>Example 3: check a bad draft</h1>
        </div>
        <LazyBoundaryDebugBadge label={step === "check" ? "bad draft check route" : "bad draft route"} />
      </section>
      {restored ? <WorkflowAutosaveRestoredNotice migrated={migrated || draft.migrationReviewRequired} /> : null}
      {requiredGate ? <RequiredUpdateGate routerMode={routerMode} message={requiredGate} /> : null}
      <DuplicateSubmitPreventedNotice visible={deduped} />
      <div className="stepper">
        {steps.map((item) => (
          <button key={item} className={cx("step", item === activeStep && "active")} type="button" onClick={() => navigateStep(item)}>
            {stepLabels[item]}
          </button>
        ))}
      </div>
      <section className="workflow-surface">
        {activeStep === "note" ? (
          <div className="form-grid">
            <label className="wide">
              Draft note
              <input value={draft.note} onChange={(event) => updateDraft({ note: event.target.value })} />
            </label>
          </div>
        ) : null}

        {activeStep === "check" ? (
          <div className="simple-proof-panel">
            <span>Saved note</span>
            <strong>{draft.note || "Empty note"}</strong>
            <p>{draft.migrationReviewRequired ? "This old draft needs a quick check before submit." : "This draft is ready to submit."}</p>
          </div>
        ) : null}

        {activeStep === "done" ? (
          <div className="receipt-panel">
            <CheckCircle2 aria-hidden="true" />
            <h2>Draft submitted</h2>
            <p>The fake check is now queued.</p>
          </div>
        ) : null}

        <footer className="workflow-actions">
          <button className="button button-secondary" type="button" onClick={previousStep} disabled={activeStep === "note" || submitMutation.isPending}>
            <ArrowLeft aria-hidden="true" />
            Back
          </button>
          <span className="autosave-chip">
            <Save aria-hidden="true" />
            Autosaved
          </span>
          {activeStep === "check" ? (
            <button className="button" type="button" onClick={submit} disabled={submitMutation.isPending}>
              {submitMutation.isPending ? "Submitting..." : "Submit draft"}
            </button>
          ) : activeStep === "done" ? null : (
            <button className="button" type="button" onClick={nextStep}>
              Continue
              <ArrowRight aria-hidden="true" />
            </button>
          )}
        </footer>
      </section>
      {blocked ? <SensitiveActionBlockedDialog message={blocked} onClose={() => setBlocked(null)} /> : null}
    </div>
  );
}
