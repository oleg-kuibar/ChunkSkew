import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, CheckCircle2, LockKeyhole, Save } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../shared/api";
import { recordAuditEvent } from "../shared/auditLogClient";
import { formatCents, cx } from "../shared/format";
import { getOrCreateIdempotencyKey, peekIdempotencyKey } from "../shared/idempotencyKeyStore";
import { isMfaVerified, verifyMfa } from "../shared/mfaSimulation";
import { getSessionSnapshot } from "../shared/sessionSimulation";
import { guardSensitiveMutation, handleBlockedMutationGuard } from "../shared/sensitiveMutationGuard";
import { readJson } from "../shared/storage";
import { trackTelemetry } from "../shared/telemetry";
import type { RouterMode, WorkflowDraft } from "../shared/types";
import { clearWorkflowDraft, restoreWorkflowDraft, saveWorkflowDraft } from "../shared/workflowDraftStore";
import {
  DuplicateSubmitPreventedNotice,
  LazyBoundaryDebugBadge,
  RequiredUpdateGate,
  SensitiveActionBlockedDialog,
  WorkflowAutosaveRestoredNotice
} from "../components/UpdateSurfaces";
import { preloadWorkflowChunks } from "../shared/preloadWorkflowChunks";

export type PaymentStep = "recipient" | "amount" | "schedule" | "review" | "mfa" | "receipt";

interface PaymentDraft {
  vendorId: string;
  vendorDraft: {
    name: string;
    category: string;
  };
  amountCents: number;
  fundingAccountId: string;
  paymentDate: string;
  memo: string;
  receiptId?: string;
}

const steps: PaymentStep[] = ["recipient", "amount", "schedule", "review", "mfa", "receipt"];

const defaultDraft: PaymentDraft = {
  vendorId: "ven_steel",
  vendorDraft: {
    name: "New compliance-reviewed vendor",
    category: "Operations"
  },
  amountCents: 125000,
  fundingAccountId: "acct_ops",
  paymentDate: "2026-07-02",
  memo: "Materials deposit"
};

function usePaymentDraft({
  idempotencyKey,
  routerMode,
  session,
  step
}: {
  idempotencyKey: string;
  routerMode: RouterMode;
  session: ReturnType<typeof getSessionSnapshot>;
  step: PaymentStep;
}) {
  const restoredDraftSnapshot = useMemo(() => readJson<WorkflowDraft<PaymentDraft> | null>("draft:payment-create", null), []);
  const [draft, setDraft] = useState<PaymentDraft>(() =>
    restoredDraftSnapshot?.schemaVersion === 2 ? { ...defaultDraft, ...restoredDraftSnapshot.formValues } : defaultDraft
  );
  const [restored] = useState(Boolean(restoredDraftSnapshot?.schemaVersion === 2));
  const [lastInteractionAt, setLastInteractionAt] = useState(Date.now());

  function persistDraft(nextDraft: PaymentDraft, nextStep: PaymentStep) {
    saveWorkflowDraft({
      id: "payment-create",
      workflowType: "payment",
      routerMode,
      currentPath: `/payments/create/${nextStep}`,
      formValues: nextDraft,
      currentStep: nextStep,
      userId: session.user.id,
      organizationId: session.organization.id,
      idempotencyKey,
      mutationIntent: "payment.submit"
    });
  }

  useEffect(() => {
    if (restored) {
      restoreWorkflowDraft<PaymentDraft>("payment-create", routerMode);
    }
  }, [restored, routerMode]);

  useEffect(() => {
    persistDraft(draft, step);
  }, [draft, idempotencyKey, routerMode, session.organization.id, session.user.id, step]);

  function updateDraft(next: Partial<PaymentDraft>) {
    setLastInteractionAt(Date.now());
    const nextDraft = { ...draft, ...next };
    setDraft(nextDraft);
    persistDraft(nextDraft, step);
  }

  return { draft, lastInteractionAt, restored, setDraft, setLastInteractionAt, updateDraft };
}

export function PaymentWorkflow({
  routerMode,
  step,
  navigateStep
}: {
  routerMode: RouterMode;
  step: PaymentStep;
  navigateStep: (step: PaymentStep) => void;
}) {
  const queryClient = useQueryClient();
  const session = getSessionSnapshot();
  const [deduped, setDeduped] = useState(false);
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null);
  const [requiredGateMessage, setRequiredGateMessage] = useState<string | null>(null);
  const idempotencyKey = useMemo(() => getOrCreateIdempotencyKey("payment.submit", "payment-create"), []);
  const vendorKey = useMemo(() => getOrCreateIdempotencyKey("vendor.create", "payment-create-vendor"), []);
  const { draft, lastInteractionAt, restored, setDraft, setLastInteractionAt, updateDraft } = usePaymentDraft({
    idempotencyKey,
    routerMode,
    session,
    step
  });

  const vendors = useQuery({ queryKey: ["vendors", routerMode], queryFn: () => api.vendors(routerMode) });
  const accounts = useQuery({ queryKey: ["accounts", routerMode], queryFn: () => api.accounts(routerMode) });

  useEffect(() => {
    void preloadWorkflowChunks("payment", routerMode);
  }, [routerMode]);

  useEffect(() => {
    if (step === "review") {
      void recordAuditEvent(routerMode, "payment_review.viewed", "User viewed payment review.", {
        idempotencyKeyPresent: Boolean(idempotencyKey)
      }, "payment");
    }
  }, [idempotencyKey, routerMode, step]);

  const submitMutation = useMutation({
    mutationFn: () => api.createPayment(routerMode, idempotencyKey, draft),
    meta: { sensitive: true, intent: "payment.submit" },
    onMutate() {
      trackTelemetry("payment_submit_started", routerMode, { idempotencyKeyPresent: Boolean(idempotencyKey) }, "payment");
    },
    onSuccess(response) {
      setDeduped(response.deduped);
      setDraft((value) => ({ ...value, receiptId: response.result.id }));
      queryClient.invalidateQueries({ queryKey: ["payments", routerMode] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", routerMode] });
      trackTelemetry(response.deduped ? "payment_submit_deduped" : "payment_submit_succeeded", routerMode, {
        paymentId: response.result.id,
        idempotencyKeyPresent: true
      }, "payment");
      clearWorkflowDraft("payment-create");
      navigateStep("receipt");
    }
  });

  const vendorMutation = useMutation({
    mutationFn: () => api.createVendor(routerMode, vendorKey, draft.vendorDraft),
    meta: { sensitive: true, intent: "vendor.create" },
    onSuccess(response) {
      updateDraft({ vendorId: response.result.id });
      void queryClient.invalidateQueries({ queryKey: ["vendors", routerMode] });
    }
  });

  function nextStep() {
    const index = steps.indexOf(step);
    navigateStep(steps[Math.min(steps.length - 1, index + 1)]);
  }

  function previousStep() {
    const index = steps.indexOf(step);
    navigateStep(steps[Math.max(0, index - 1)]);
  }

  function submitPayment() {
    void recordAuditEvent(routerMode, "payment_submit.attempted", "User attempted to submit a payment.", {
      idempotencyKeyPresent: Boolean(idempotencyKey)
    }, "payment");
    const mfaVerified = isMfaVerified("payment.submit");
    if (!mfaVerified) {
      setBlockedMessage("Confirm the fake MFA challenge before submitting this payment.");
      return;
    }
    const guard = guardSensitiveMutation({
      routerMode,
      intent: "payment.submit",
      workflowType: "payment",
      currentRoute: window.location.pathname,
      dirtyForm: true,
      mutationPending: submitMutation.isPending,
      mfaPending: !mfaVerified,
      idempotencyKeyPresent: Boolean(peekIdempotencyKey("payment.submit", "payment-create")),
      lastInteractionAt
    });
    if (handleBlockedMutationGuard(guard, "This action is paused.", setRequiredGateMessage, setBlockedMessage)) {
      return;
    }
    submitMutation.mutate();
  }

  function createVendor() {
    const guard = guardSensitiveMutation({
      routerMode,
      intent: "vendor.create",
      workflowType: "vendor",
      currentRoute: window.location.pathname,
      dirtyForm: true,
      mutationPending: vendorMutation.isPending,
      mfaPending: false,
      idempotencyKeyPresent: Boolean(vendorKey),
      lastInteractionAt
    });
    if (handleBlockedMutationGuard(guard, "Vendor creation is paused.", setRequiredGateMessage, setBlockedMessage)) {
      return;
    }
    vendorMutation.mutate();
  }

  const vendor = vendors.data?.find((item) => item.id === draft.vendorId);
  const account = accounts.data?.find((item) => item.id === draft.fundingAccountId);

  return (
    <div className="page-stack workflow-page" data-testid="payment-workflow">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Payments</p>
          <h1>Create payment</h1>
        </div>
        <LazyBoundaryDebugBadge label={step === "review" ? "payment-review route" : "payment workflow"} />
      </section>

      {restored ? <WorkflowAutosaveRestoredNotice /> : null}
      {requiredGateMessage ? <RequiredUpdateGate routerMode={routerMode} message={requiredGateMessage} /> : null}
      <DuplicateSubmitPreventedNotice visible={deduped} />

      <div className="stepper" aria-label="Payment workflow steps">
        {steps.map((item) => (
          <button
            key={item}
            type="button"
            className={cx("step", item === step && "active")}
            onClick={() => navigateStep(item)}
            disabled={submitMutation.isPending}
          >
            {item}
          </button>
        ))}
      </div>

      <section className="workflow-surface">
        {step === "recipient" ? (
          <div className="form-grid">
            <label>
              Recipient vendor
              <select value={draft.vendorId} onChange={(event) => updateDraft({ vendorId: event.target.value })}>
                {vendors.data?.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.accountMask}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Memo
              <input value={draft.memo} onChange={(event) => updateDraft({ memo: event.target.value })} />
            </label>
            <label>
              New vendor name
              <input
                value={draft.vendorDraft.name}
                onChange={(event) => updateDraft({ vendorDraft: { ...draft.vendorDraft, name: event.target.value } })}
              />
            </label>
            <label>
              New vendor category
              <input
                value={draft.vendorDraft.category}
                onChange={(event) => updateDraft({ vendorDraft: { ...draft.vendorDraft, category: event.target.value } })}
              />
            </label>
            <div className="wide">
              <button className="button button-secondary" type="button" onClick={createVendor} disabled={vendorMutation.isPending}>
                {vendorMutation.isPending ? "Creating vendor..." : "Create fake vendor"}
              </button>
            </div>
          </div>
        ) : null}

        {step === "amount" ? (
          <div className="form-grid">
            <label>
              Amount
              <input
                inputMode="decimal"
                value={(draft.amountCents / 100).toFixed(2)}
                onChange={(event) => updateDraft({ amountCents: Math.round(Number(event.target.value || 0) * 100) })}
              />
            </label>
            <div className="summary-tile">
              <span>Scheduled amount</span>
              <strong>{formatCents(draft.amountCents)}</strong>
            </div>
          </div>
        ) : null}

        {step === "schedule" ? (
          <div className="form-grid">
            <label>
              Funding account
              <select value={draft.fundingAccountId} onChange={(event) => updateDraft({ fundingAccountId: event.target.value })}>
                {accounts.data?.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {item.maskedNumber}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Payment date
              <input type="date" value={draft.paymentDate} onChange={(event) => updateDraft({ paymentDate: event.target.value })} />
            </label>
          </div>
        ) : null}

        {step === "review" ? (
          <div className="review-layout">
            <div className="summary-tile">
              <span>Recipient</span>
              <strong>{vendor?.name ?? draft.vendorId}</strong>
            </div>
            <div className="summary-tile">
              <span>Amount</span>
              <strong>{formatCents(draft.amountCents)}</strong>
            </div>
            <div className="summary-tile">
              <span>Funding</span>
              <strong>{account?.name ?? draft.fundingAccountId}</strong>
            </div>
            <div className="summary-tile">
              <span>Idempotency</span>
              <strong>Key saved</strong>
            </div>
          </div>
        ) : null}

        {step === "mfa" ? (
          <div className="mfa-panel">
            <LockKeyhole aria-hidden="true" />
            <div>
              <h2>Confirm this payment</h2>
              <p>A fake MFA challenge is required before submitting a payment.</p>
            </div>
            <button
              className="button"
              type="button"
              onClick={() => {
                verifyMfa("payment.submit");
                setLastInteractionAt(Date.now());
              }}
            >
              <CheckCircle2 aria-hidden="true" />
              Mark MFA verified
            </button>
          </div>
        ) : null}

        {step === "receipt" ? (
          <div className="receipt-panel" data-testid="payment-receipt">
            <CheckCircle2 aria-hidden="true" />
            <h2>Payment scheduled</h2>
            <p>{draft.receiptId ? `Receipt ${draft.receiptId}` : "The payment result is ready."}</p>
          </div>
        ) : null}

        <footer className="workflow-actions">
          <button className="button button-secondary" type="button" onClick={previousStep} disabled={step === "recipient" || submitMutation.isPending}>
            <ArrowLeft aria-hidden="true" />
            Back
          </button>
          <span className="autosave-chip">
            <Save aria-hidden="true" />
            Autosaved
          </span>
          {step === "mfa" ? (
            <button className="button" type="button" onClick={submitPayment} disabled={submitMutation.isPending}>
              {submitMutation.isPending ? "Submitting..." : "Submit payment"}
            </button>
          ) : step === "receipt" ? null : (
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
