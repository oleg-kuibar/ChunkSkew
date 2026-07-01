import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";
import { api } from "../shared/api";
import { formatCents } from "../shared/format";
import { LazyBoundaryDebugBadge } from "../components/UpdateSurfaces";

export function Component() {
  const query = useQuery({ queryKey: ["transactions", "react-router", "report"], queryFn: () => api.transactions("react-router") });
  const total = query.data?.reduce((sum, item) => sum + item.amountCents, 0) ?? 0;
  const flagged = query.data?.filter((item) => item.riskScore >= 70).length ?? 0;

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Lazy report</p>
          <h1>Transaction exposure report</h1>
        </div>
        <LazyBoundaryDebugBadge label="transaction-report route" />
      </section>
      <section className="report-grid">
        <div className="summary-tile">
          <BarChart3 aria-hidden="true" />
          <span>Net movement</span>
          <strong>{formatCents(total)}</strong>
        </div>
        <div className="summary-tile">
          <span>Flagged rows</span>
          <strong>{flagged}</strong>
        </div>
        <div className="summary-tile">
          <span>Rows scanned</span>
          <strong>{query.data?.length ?? 0}</strong>
        </div>
      </section>
      <div className="chart-slab" aria-label="Mock transaction risk histogram">
        {Array.from({ length: 24 }, (_, index) => (
          <span key={index} style={{ height: `${18 + ((index * 17) % 70)}%` }} />
        ))}
      </div>
    </div>
  );
}
