import { createLazyRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import { ChunkFailureFallback, LazyBoundaryDebugBadge } from "../../components/UpdateSurfaces";
import { api } from "../../shared/api";
import { formatCents, formatDate } from "../../shared/format";

export const Route = createLazyRoute("/invoices/$invoiceId")({
  component: TanStackInvoiceDetail,
  pendingComponent: () => <div className="loading-panel">Loading invoice route...</div>,
  errorComponent: ({ error }) => (
    <ChunkFailureFallback error={error} routerMode="tanstack-router" workflowType="invoice" routeId="tanstack-invoice-lazy" />
  )
});

function TanStackInvoiceDetail() {
  const params = Route.useParams();
  const navigate = useNavigate();
  const query = useQuery({
    queryKey: ["invoice", "tanstack-router", params.invoiceId],
    queryFn: () => api.invoice("tanstack-router", params.invoiceId)
  });
  if (!query.data) {
    return <div className="loading-panel">Loading invoice...</div>;
  }
  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">TanStack lazy invoice</p>
          <h1>{query.data.vendorName}</h1>
        </div>
        <LazyBoundaryDebugBadge label="tanstack Route.lazy invoice" />
      </section>
      <section className="detail-grid">
        <div className="summary-tile">
          <span>Amount</span>
          <strong>{formatCents(query.data.amountCents)}</strong>
        </div>
        <div className="summary-tile">
          <span>Due</span>
          <strong>{formatDate(query.data.dueDate)}</strong>
        </div>
        <div className="summary-tile">
          <span>Status</span>
          <strong>{query.data.status}</strong>
        </div>
      </section>
      <button className="button button-secondary" type="button" onClick={() => void navigate({ to: "/invoices" })}>
        <CheckCircle2 aria-hidden="true" />
        Back to queue
      </button>
    </div>
  );
}
