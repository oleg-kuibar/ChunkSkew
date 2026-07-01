import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { api } from "../shared/api";
import type { Invoice } from "../shared/domain";
import { getOrCreateIdempotencyKey } from "../shared/idempotencyKeyStore";
import { getSessionSnapshot } from "../shared/sessionSimulation";
import { guardSensitiveMutation, handleBlockedMutationGuard } from "../shared/sensitiveMutationGuard";
import type { RouterMode } from "../shared/types";
import { saveWorkflowDraft } from "../shared/workflowDraftStore";
import { DuplicateSubmitPreventedNotice, RequiredUpdateGate, SensitiveActionBlockedDialog } from "../components/UpdateSurfaces";

type InvoiceModalAction = "approve" | "reject";

function invoiceIntent(action: InvoiceModalAction) {
  return action === "approve" ? "invoice.approve" : "invoice.reject";
}

function saveRejectInvoiceDraft({
  idempotencyKey,
  invoiceId,
  note,
  organizationId,
  routerMode,
  userId
}: {
  idempotencyKey: string;
  invoiceId: string;
  note: string;
  organizationId: string;
  routerMode: RouterMode;
  userId: string;
}) {
  saveWorkflowDraft({
    id: `invoice-reject-${invoiceId}`,
    workflowType: "invoice",
    routerMode,
    currentPath: `/invoices/${invoiceId}`,
    currentStep: "reject-modal",
    formValues: { note },
    userId,
    organizationId,
    idempotencyKey,
    mutationIntent: "invoice.reject"
  });
}

function saveRejectInvoiceDraftIfNeeded({
  action,
  idempotencyKey,
  invoiceId,
  note,
  organizationId,
  routerMode,
  userId
}: {
  action: InvoiceModalAction;
  idempotencyKey: string;
  invoiceId: string;
  note: string;
  organizationId: string;
  routerMode: RouterMode;
  userId: string;
}) {
  if (action !== "reject") {
    return;
  }
  saveRejectInvoiceDraft({
    idempotencyKey,
    invoiceId,
    note,
    organizationId,
    routerMode,
    userId
  });
}

function blockInvoiceActionIfNeeded({
  action,
  idempotencyKey,
  mutationPending,
  note,
  onBlocked,
  onRequiredUpdate,
  routerMode
}: {
  action: InvoiceModalAction;
  idempotencyKey: string;
  mutationPending: boolean;
  note: string;
  onBlocked: (message: string) => void;
  onRequiredUpdate: (message: string | null) => void;
  routerMode: RouterMode;
}) {
  const guard = guardSensitiveMutation({
    routerMode,
    intent: invoiceIntent(action),
    workflowType: "invoice",
    currentRoute: window.location.pathname,
    dirtyForm: action === "reject" && note.length > 0,
    mutationPending,
    mfaPending: false,
    idempotencyKeyPresent: Boolean(idempotencyKey),
    lastInteractionAt: Date.now()
  });
  return handleBlockedMutationGuard(guard, "This approval is paused.", onRequiredUpdate, onBlocked);
}

export function InvoiceApprovalModal({
  invoice,
  routerMode,
  action,
  onClose
}: {
  invoice: Invoice;
  routerMode: RouterMode;
  action: InvoiceModalAction;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const session = getSessionSnapshot();
  const [note, setNote] = useState("");
  const [blocked, setBlocked] = useState<string | null>(null);
  const [requiredGate, setRequiredGate] = useState<string | null>(null);
  const [deduped, setDeduped] = useState(false);
  const idempotencyKey = useMemo(() => getOrCreateIdempotencyKey(`invoice.${action}`, invoice.id), [action, invoice.id]);

  useEffect(() => {
    saveRejectInvoiceDraftIfNeeded({
      action,
      idempotencyKey,
      invoiceId: invoice.id,
      note,
      organizationId: session.organization.id,
      routerMode,
      userId: session.user.id
    });
  }, [action, idempotencyKey, invoice.id, note, routerMode, session.organization.id, session.user.id]);

  const mutation = useMutation({
    mutationFn: () => api.invoiceAction(routerMode, invoice.id, action, idempotencyKey, { note }),
    meta: { sensitive: true, intent: `invoice.${action}` },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["invoice", routerMode, invoice.id] });
      const previous = queryClient.getQueryData<Invoice>(["invoice", routerMode, invoice.id]);
      queryClient.setQueryData<Invoice>(["invoice", routerMode, invoice.id], {
        ...invoice,
        status: action === "approve" ? "approved" : "rejected"
      });
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["invoice", routerMode, invoice.id], context.previous);
      }
    },
    onSuccess: (response) => {
      setDeduped(response.deduped);
      queryClient.invalidateQueries({ queryKey: ["invoices", routerMode] });
      queryClient.invalidateQueries({ queryKey: ["invoice", routerMode, invoice.id] });
      window.setTimeout(onClose, 400);
    }
  });

  function submit() {
    if (blockInvoiceActionIfNeeded({
      action,
      idempotencyKey,
      mutationPending: mutation.isPending,
      note,
      onBlocked: setBlocked,
      onRequiredUpdate: setRequiredGate,
      routerMode
    })) {
      return;
    }
    mutation.mutate();
  }

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="invoice-modal-title">
        <h2 id="invoice-modal-title">{action === "approve" ? "Approve invoice" : "Reject invoice"}</h2>
        <p>
          {invoice.vendorName} · {invoice.id}
        </p>
        {action === "reject" ? (
          <label>
            Rejection note
            <textarea value={note} onChange={(event) => setNote(event.target.value)} />
          </label>
        ) : null}
        {requiredGate ? <RequiredUpdateGate routerMode={routerMode} message={requiredGate} /> : null}
        <DuplicateSubmitPreventedNotice visible={deduped} />
        <footer className="modal-actions">
          <button className="button button-secondary" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button" type="button" onClick={submit} disabled={mutation.isPending}>
            {action === "approve" ? <CheckCircle2 aria-hidden="true" /> : <XCircle aria-hidden="true" />}
            {mutation.isPending ? "Saving..." : action === "approve" ? "Approve" : "Reject"}
          </button>
        </footer>
      </section>
      {blocked ? <SensitiveActionBlockedDialog message={blocked} onClose={() => setBlocked(null)} /> : null}
    </div>
  );
}
