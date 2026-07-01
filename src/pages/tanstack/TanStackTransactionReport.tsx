import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { api } from "../../shared/api";
import { formatCents } from "../../shared/format";

export function TanStackTransactionReport() {
  const query = useQuery({ queryKey: ["transactions", "tanstack-router", "report"], queryFn: () => api.transactions("tanstack-router") });
  const total = query.data?.reduce((sum, item) => sum + item.amountCents, 0) ?? 0;
  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">TanStack report</p>
          <h1>Transaction exposure report</h1>
        </div>
      </section>
      <section className="report-grid">
        <div className="summary-tile">
          <BarChart3 aria-hidden="true" />
          <span>Net movement</span>
          <strong>{formatCents(total)}</strong>
        </div>
        <div className="summary-tile">
          <span>Rows scanned</span>
          <strong>{query.data?.length ?? 0}</strong>
        </div>
      </section>
    </div>
  );
}
