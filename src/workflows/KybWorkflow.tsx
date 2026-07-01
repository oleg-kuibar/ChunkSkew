import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CheckCircle2, FileWarning, Save } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../shared/api";
import { getOrCreateIdempotencyKey } from "../shared/idempotencyKeyStore";
import { componentLazyImport } from "../shared/lazyRoute";
import { preloadWorkflowChunks } from "../shared/preloadWorkflowChunks";
import { getSessionSnapshot } from "../shared/sessionSimulation";
import { guardSensitiveMutation } from "../shared/sensitiveMutationGuard";
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
  const restoredDraftSnapshot = useMemo(() => readJson<WorkflowDraft<KybDraft> | null>("draft:kyb", null), []);
  const [draft, setDraft] = useState<KybDraft>(() =>
    restoredDraftSnapshot?.schemaVersion === 2 ? { ...defaultDraft, ...restoredDraftSnapshot.formValues } : defaultDraft
  );
  const [restored, setRestored] = useState(Boolean(restoredDraftSnapshot?.schemaVersion === 2));
  const [migrated, setMigrated] = useState(false);
  const [incompatible, setIncompatible] = useState<string | null>(() =>
    restoredDraftSnapshot && restoredDraftSnapshot.schemaVersion !== 1 && restoredDraftSnapshot.schemaVersion !== 2
      ? `Draft schema ${restoredDraftSnapshot.schemaVersion} is not compatible with schema 2.`
      : null
  );
  const [draftReadyToSave, setDraftReadyToSave] = useState(
    !restoredDraftSnapshot || restoredDraftSnapshot.schemaVersion === 2
  );
  const userEditedRef = useRef(false);
  const [userEdited, setUserEdited] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [requiredGate, setRequiredGate] = useState<string | null>(null);
  const [deduped, setDeduped] = useState(false);
  const idempotencyKey = useMemo(() => getOrCreateIdempotencyKey("kyb.submit", "kyb"), []);
  const kybQuery = useQuery({ queryKey: ["kyb", routerMode], queryFn: () => api.kyb(routerMode) });

  useEffect(() => {
    void preloadWorkflowChunks("kyb", routerMode);
  }, [routerMode]);

  useEffect(() => {
    const restoredDraft = restoreWorkflowDraft<KybDraft>("kyb", routerMode);
    if (restoredDraft.status === "restored") {
      setDraft({ ...defaultDraft, ...restoredDraft.draft.formValues });
      setRestored(true);
      setMigrated(restoredDraft.migrated);
      setDraftReadyToSave(true);
    }
    if (restoredDraft.status === "incompatible") {
      setIncompatible(restoredDraft.reason);
      setDraftReadyToSave(false);
    }
    if (restoredDraft.status === "missing") {
      setDraftReadyToSave(true);
    }
  }, [routerMode]);

  useEffect(() => {
    if (!draftReadyToSave || incompatible) {
      return;
    }
    persistDraft(draft, step);
  }, [draft, draftReadyToSave, idempotencyKey, incompatible, routerMode, session.organization.id, session.user.id, step]);

  function persistDraft(nextDraft: KybDraft, nextStep: KybStep) {
    saveWorkflowDraft({
      id: "kyb",
      workflowType: "kyb",
      routerMode,
      currentPath: `/kyb/${nextStep}`,
      currentStep: nextStep,
      formValues: nextDraft,
      userId: session.user.id,
      organizationId: session.organization.id,
      idempotencyKey,
      mutationIntent: "kyb.submit"
    });
  }

  useEffect(() => {
    if (!restored && !userEdited && !userEditedRef.current && kybQuery.data) {
      setDraft((value) => ({
        ...value,
        legalName: kybQuery.data.businessDetails.legalName,
        taxIdMask: kybQuery.data.businessDetails.taxIdMask,
        address: kybQuery.data.businessDetails.address,
        owners: kybQuery.data.owners.map((owner) => ({
          name: owner.name,
          ownershipPercent: owner.ownershipPercent
        })),
        uploadedDocumentIds: kybQuery.data.documents.filter((doc) => doc.status === "uploaded").map((doc) => doc.id)
      }));
    }
  }, [kybQuery.data, restored, userEdited]);

  const submitMutation = useMutation({
    mutationFn: () => api.submitKyb(routerMode, idempotencyKey, draft),
    meta: { sensitive: true, intent: "kyb.submit" },
    onSuccess(response) {
      setDeduped(response.deduped);
      queryClient.invalidateQueries({ queryKey: ["kyb", routerMode] });
      navigateStep("submitted");
    }
  });

  function updateDraft(next: Partial<KybDraft>) {
    userEditedRef.current = true;
    setUserEdited(true);
    setDraft((value) => {
      const merged = { ...value, ...next };
      if (draftReadyToSave && !incompatible) {
        persistDraft(merged, step);
      }
      return merged;
    });
  }

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
    if (!guard.allowed) {
      if (guard.code === "required-update") {
        setRequiredGate(guard.reason ?? null);
      } else {
        setBlocked(guard.reason ?? "KYB submission is paused.");
      }
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
