import { lazy, Suspense, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import { api } from "../shared/api";
import { formatCents, formatDate } from "../shared/format";
import { componentLazyImport } from "../shared/lazyRoute";
import { LazyBoundaryDebugBadge } from "../components/UpdateSurfaces";

const LazyApprovalModal = lazy(() =>
  componentLazyImport("invoice-approval-modal", "react-router", "invoice", () => import("../workflows/InvoiceApprovalModal"))().then((module) => ({
    default: module.InvoiceApprovalModal
  }))
);

export function Component() {
  const params = useParams();
  const invoiceId = params.invoiceId ?? "";
  const [modalAction, setModalAction] = useState<"approve" | "reject" | null>(null);
  const query = useQuery({ queryKey: ["invoice", "react-router", invoiceId], queryFn: () => api.invoice("react-router", invoiceId) });

  if (query.isLoading) {
    return <div className="loading-panel">Loading invoice...</div>;
  }
  if (!query.data) {
    return <div className="empty-state">Invoice not found.</div>;
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Invoice detail</p>
          <h1>{query.data.vendorName}</h1>
        </div>
        <LazyBoundaryDebugBadge label="invoice-detail route" />
      </section>
      <section className="detail-grid">
        <div className="summary-tile">
          <span>Amount</span>
          <strong>{formatCents(query.data.amountCents)}</strong>
        </div>
        <div className="summary-tile">
          <span>Due date</span>
          <strong>{formatDate(query.data.dueDate)}</strong>
        </div>
        <div className="summary-tile">
          <span>Status</span>
          <strong>{query.data.status}</strong>
        </div>
        <div className="summary-tile">
          <span>Risk</span>
          <strong>{query.data.risk}</strong>
        </div>
      </section>
      <section className="workflow-actions left">
        <button className="button" type="button" onClick={() => setModalAction("approve")}>
          <CheckCircle2 aria-hidden="true" />
          Approve
        </button>
        <button className="button button-secondary" type="button" onClick={() => setModalAction("reject")}>
          <XCircle aria-hidden="true" />
          Reject
        </button>
      </section>
      {modalAction ? (
        <Suspense fallback={<div className="loading-panel">Preparing approval controls...</div>}>
          <LazyApprovalModal invoice={query.data} routerMode="react-router" action={modalAction} onClose={() => setModalAction(null)} />
        </Suspense>
      ) : null}
    </div>
  );
}
