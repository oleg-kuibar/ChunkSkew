import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CheckCircle2, FileWarning, Save } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../shared/api";
import { getOrCreateIdempotencyKey } from "../shared/idempotencyKeyStore";
import { componentLazyImport } from "../shared/lazyRoute";
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

const LazyDocumentsStep = lazy(() =>
  componentLazyImport("kyb-documents", "react-router", "kyb", () => import("./KybDocumentsStep"))().then((module) => ({
    default: module.KybDocumentsStep
  }))
);

export type KybStep = "business" | "owners" | "documents" | "review" | "submitted";

interface KybDraft {
  legalName: string;
  taxIdMask: string;
  address: string;
  owners: Array<{ name: string; ownershipPercent: number }>;
  uploadedDocumentIds: string[];
  migrationReviewRequired?: boolean;
}

const steps: KybStep[] = ["business", "owners", "documents", "review", "submitted"];

const defaultDraft: KybDraft = {
  legalName: "Northstar Fabrication LLC",
  taxIdMask: "**-***4821",
  address: "100 Market Street, Test City, DE",
  owners: [
    { name: "Olivia Harper", ownershipPercent: 62 },
    { name: "Miles Chen", ownershipPercent: 18 }
  ],
  uploadedDocumentIds: ["doc_articles"]
};

type KybSnapshot = Awaited<ReturnType<typeof api.kyb>>;

interface KybDraftState {
  draft: KybDraft;
  restored: boolean;
  migrated: boolean;
  incompatible: string | null;
  readyToSave: boolean;
}

function draftFromKybSnapshot(snapshot: KybSnapshot): KybDraft {
  return {
    legalName: snapshot.businessDetails.legalName,
    taxIdMask: snapshot.businessDetails.taxIdMask,
    address: snapshot.businessDetails.address,
    owners: snapshot.owners.map((owner) => ({
      name: owner.name,
      ownershipPercent: owner.ownershipPercent
    })),
    uploadedDocumentIds: snapshot.documents.filter((doc) => doc.status === "uploaded").map((doc) => doc.id)
  };
}

function incompatibleKybDraftReason(draft: WorkflowDraft<KybDraft> | null) {
  if (!draft || draft.schemaVersion === 1 || draft.schemaVersion === 2) {
    return null;
  }
  return `Draft schema ${draft.schemaVersion} is not compatible with schema 2.`;
}

function initialKybDraftState(restoredDraftSnapshot: WorkflowDraft<KybDraft> | null): KybDraftState {
  const currentSchema = restoredDraftSnapshot?.schemaVersion;
  const restoredFormValues = currentSchema === 2 ? restoredDraftSnapshot?.formValues : null;
  return {
    draft: restoredFormValues ? { ...defaultDraft, ...restoredFormValues } : defaultDraft,
    restored: currentSchema === 2,
    migrated: false,
    incompatible: incompatibleKybDraftReason(restoredDraftSnapshot),
    readyToSave: !restoredDraftSnapshot || currentSchema === 2
  };
}

function restoreKybDraftState(routerMode: RouterMode): KybDraftState {
  const restoredDraft = restoreWorkflowDraft<KybDraft>("kyb", routerMode);
  if (restoredDraft.status === "restored") {
    return {
      draft: { ...defaultDraft, ...restoredDraft.draft.formValues },
      restored: true,
      migrated: restoredDraft.migrated,
      incompatible: null,
      readyToSave: true
    };
  }
  if (restoredDraft.status === "incompatible") {
    return {
      ...initialKybDraftState(null),
      incompatible: restoredDraft.reason,
      readyToSave: false
    };
  }
  return initialKybDraftState(null);
}

function shouldHydrateKybFromServer(
  restored: boolean,
  userEdited: boolean,
  userEditedRef: boolean,
  snapshot?: KybSnapshot
): snapshot is KybSnapshot {
  return !restored && !userEdited && !userEditedRef && Boolean(snapshot);
}

function canSaveKybDraft(state: KybDraftState) {
  return state.readyToSave && !state.incompatible;
}

function hydrateKybDraftFromServer(
  state: KybDraftState,
  userEdited: boolean,
  userEditedRef: boolean,
  snapshot?: KybSnapshot
): KybDraftState {
  if (!shouldHydrateKybFromServer(state.restored, userEdited, userEditedRef, snapshot)) {
    return state;
  }
  return {
    ...state,
    draft: {
      ...state.draft,
      ...draftFromKybSnapshot(snapshot)
    }
  };
}

function saveKybDraft({
  draft,
  idempotencyKey,
  organizationId,
  routerMode,
  step,
  userId
}: {
  draft: KybDraft;
  idempotencyKey: string;
  organizationId: string;
  routerMode: RouterMode;
  step: KybStep;
  userId: string;
}) {
  saveWorkflowDraft({
    id: "kyb",
    workflowType: "kyb",
    routerMode,
    currentPath: `/kyb/${step}`,
    currentStep: step,
    formValues: draft,
    userId,
    organizationId,
    idempotencyKey,
    mutationIntent: "kyb.submit"
  });
}

function saveKybDraftIfReady(
  state: KybDraftState,
  draft: KybDraft,
  step: KybStep,
  {
    idempotencyKey,
    organizationId,
    routerMode,
    userId
  }: {
    idempotencyKey: string;
    organizationId: string;
    routerMode: RouterMode;
    userId: string;
  }
) {
  if (!canSaveKybDraft(state)) {
    return;
  }
  saveKybDraft({
    draft,
    idempotencyKey,
    organizationId,
    routerMode,
    step,
    userId
  });
}

function useKybDraft({
  idempotencyKey,
  routerMode,
  session,
  snapshot,
  step
}: {
  idempotencyKey: string;
  routerMode: RouterMode;
  session: ReturnType<typeof getSessionSnapshot>;
  snapshot?: KybSnapshot;
  step: KybStep;
}) {
  const restoredDraftSnapshot = useMemo(() => readJson<WorkflowDraft<KybDraft> | null>("draft:kyb", null), []);
  const [draftState, setDraftState] = useState<KybDraftState>(() => initialKybDraftState(restoredDraftSnapshot));
  const userEditedRef = useRef(false);
  const [userEdited, setUserEdited] = useState(false);

  useEffect(() => {
    setDraftState(restoreKybDraftState(routerMode));
  }, [routerMode]);

  useEffect(() => {
    saveKybDraftIfReady(draftState, draftState.draft, step, {
      idempotencyKey,
      organizationId: session.organization.id,
      routerMode,
      userId: session.user.id
    });
  }, [draftState, idempotencyKey, routerMode, session.organization.id, session.user.id, step]);

  useEffect(() => {
    setDraftState((value) => hydrateKybDraftFromServer(value, userEdited, userEditedRef.current, snapshot));
  }, [snapshot, userEdited]);

  function updateDraft(next: Partial<KybDraft>) {
    const merged = { ...draftState.draft, ...next };
    userEditedRef.current = true;
    setUserEdited(true);
    setDraftState((value) => ({ ...value, draft: merged }));
    saveKybDraftIfReady(draftState, merged, step, {
      idempotencyKey,
      organizationId: session.organization.id,
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

export function KybWorkflow({
  routerMode,
  step,
  navigateStep
}: {
  routerMode: RouterMode;
  step: KybStep;
  navigateStep: (step: KybStep) => void;
}) {
  const session = getSessionSnapshot();
  const queryClient = useQueryClient();
  const [blocked, setBlocked] = useState<string | null>(null);
  const [requiredGate, setRequiredGate] = useState<string | null>(null);
  const [deduped, setDeduped] = useState(false);
  const idempotencyKey = useMemo(() => getOrCreateIdempotencyKey("kyb.submit", "kyb"), []);
  const kybQuery = useQuery({ queryKey: ["kyb", routerMode], queryFn: () => api.kyb(routerMode) });
  const { draft, incompatible, migrated, restored, setIncompatible, updateDraft } = useKybDraft({
    idempotencyKey,
    routerMode,
    session,
    snapshot: kybQuery.data,
    step
  });

  useEffect(() => {
    void preloadWorkflowChunks("kyb", routerMode);
  }, [routerMode]);

  const submitMutation = useMutation({
    mutationFn: () => api.submitKyb(routerMode, idempotencyKey, draft),
    meta: { sensitive: true, intent: "kyb.submit" },
    onSuccess(response) {
      setDeduped(response.deduped);
      queryClient.invalidateQueries({ queryKey: ["kyb", routerMode] });
      navigateStep("submitted");
    }
  });

  function submit() {
    const guard = guardSensitiveMutation({
      routerMode,
      intent: "kyb.submit",
      workflowType: "kyb",
      currentRoute: window.location.pathname,
      dirtyForm: true,
      mutationPending: submitMutation.isPending,
      mfaPending: false,
      idempotencyKeyPresent: Boolean(idempotencyKey),
      lastInteractionAt: Date.now()
    });
    if (handleBlockedMutationGuard(guard, "KYB submission is paused.", setRequiredGate, setBlocked)) {
      return;
    }
    submitMutation.mutate();
  }

  function nextStep() {
    navigateStep(steps[Math.min(steps.length - 1, steps.indexOf(step) + 1)]);
  }

  function previousStep() {
    navigateStep(steps[Math.max(0, steps.indexOf(step) - 1)]);
  }

  if (incompatible) {
    return (
      <section className="fallback-panel" data-testid="incompatible-draft-fallback">
        <div className="fallback-icon">
          <FileWarning aria-hidden="true" />
        </div>
        <div className="fallback-body">
          <h2>Draft needs review</h2>
          <p>{incompatible} Start from the saved KYB record and review all fields before submitting.</p>
          <button className="button" type="button" onClick={() => setIncompatible(null)}>
            Continue with server draft
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="page-stack workflow-page" data-testid="kyb-workflow">
      <section className="page-heading">
        <div>
          <p className="eyebrow">KYB / KYC</p>
          <h1>Business verification</h1>
        </div>
        <LazyBoundaryDebugBadge label={step === "review" ? "kyb-review route" : "kyb workflow"} />
      </section>
      {restored ? <WorkflowAutosaveRestoredNotice migrated={migrated || draft.migrationReviewRequired} /> : null}
      {requiredGate ? <RequiredUpdateGate routerMode={routerMode} message={requiredGate} /> : null}
      <DuplicateSubmitPreventedNotice visible={deduped} />
      <div className="stepper">
        {steps.map((item) => (
          <button key={item} className={cx("step", item === step && "active")} type="button" onClick={() => navigateStep(item)}>
            {item}
          </button>
        ))}
      </div>
      <section className="workflow-surface">
        {step === "business" ? (
          <div className="form-grid">
            <label>
              Legal business name
              <input value={draft.legalName} onChange={(event) => updateDraft({ legalName: event.target.value })} />
            </label>
            <label>
              Tax ID mask
              <input value={draft.taxIdMask} onChange={(event) => updateDraft({ taxIdMask: event.target.value })} />
            </label>
            <label className="wide">
              Business address
              <input value={draft.address} onChange={(event) => updateDraft({ address: event.target.value })} />
            </label>
          </div>
        ) : null}

        {step === "owners" ? (
          <div className="list">
            {draft.owners.map((owner, index) => (
              <div className="list-row" key={owner.name}>
                <div>
                  <strong>{owner.name}</strong>
                  <span>{owner.ownershipPercent}% ownership</span>
                </div>
                <input
                  aria-label={`${owner.name} ownership`}
                  type="number"
                  value={owner.ownershipPercent}
                  onChange={(event) => {
                    const owners = [...draft.owners];
                    owners[index] = { ...owner, ownershipPercent: Number(event.target.value) };
                    updateDraft({ owners });
                  }}
                />
              </div>
            ))}
          </div>
        ) : null}

        {step === "documents" ? (
          <Suspense fallback={<div className="loading-panel">Loading document review...</div>}>
            <LazyDocumentsStep uploadedDocumentIds={draft.uploadedDocumentIds} onChange={(ids) => updateDraft({ uploadedDocumentIds: ids })} />
          </Suspense>
        ) : null}

        {step === "review" ? (
          <div className="review-layout">
            <div className="summary-tile">
              <span>Legal name</span>
              <strong>{draft.legalName}</strong>
            </div>
            <div className="summary-tile">
              <span>Owners</span>
              <strong>{draft.owners.length}</strong>
            </div>
            <div className="summary-tile">
              <span>Documents</span>
              <strong>{draft.uploadedDocumentIds.length}</strong>
            </div>
            <div className="summary-tile">
              <span>Review status</span>
              <strong>{draft.migrationReviewRequired ? "Review migrated draft" : "Ready"}</strong>
            </div>
          </div>
        ) : null}

        {step === "submitted" ? (
          <div className="receipt-panel">
            <CheckCircle2 aria-hidden="true" />
            <h2>KYB submitted</h2>
            <p>The fake compliance review is now queued.</p>
          </div>
        ) : null}

        <footer className="workflow-actions">
          <button className="button button-secondary" type="button" onClick={previousStep} disabled={step === "business" || submitMutation.isPending}>
            <ArrowLeft aria-hidden="true" />
            Back
          </button>
          <span className="autosave-chip">
            <Save aria-hidden="true" />
            Autosaved
          </span>
          {step === "review" ? (
            <button className="button" type="button" onClick={submit} disabled={submitMutation.isPending}>
              {submitMutation.isPending ? "Submitting..." : "Submit KYB"}
            </button>
          ) : step === "submitted" ? null : (
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
