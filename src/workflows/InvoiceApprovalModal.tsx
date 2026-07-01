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

export function InvoiceApprovalModal({
  invoice,
  routerMode,
  action,
  onClose
}: {
  invoice: Invoice;
  routerMode: RouterMode;
  action: "approve" | "reject";
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
    if (action === "reject") {
      saveWorkflowDraft({
        id: `invoice-reject-${invoice.id}`,
        workflowType: "invoice",
        routerMode,
        currentPath: `/invoices/${invoice.id}`,
        currentStep: "reject-modal",
        formValues: { note },
        userId: session.user.id,
        organizationId: session.organization.id,
        idempotencyKey,
        mutationIntent: "invoice.reject"
      });
    }
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
    const guard = guardSensitiveMutation({
      routerMode,
      intent: action === "approve" ? "invoice.approve" : "invoice.reject",
      workflowType: "invoice",
      currentRoute: window.location.pathname,
      dirtyForm: action === "reject" && note.length > 0,
      mutationPending: mutation.isPending,
      mfaPending: false,
      idempotencyKeyPresent: Boolean(idempotencyKey),
      lastInteractionAt: Date.now()
    });
    if (handleBlockedMutationGuard(guard, "This approval is paused.", setRequiredGate, setBlocked)) {
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
