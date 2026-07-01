import { useQuery } from "@tanstack/react-query";
import { BarChart3, Search } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "../shared/api";
import type { Transaction } from "../shared/domain";
import { formatCents, formatDate } from "../shared/format";
import { componentLazyImport } from "../shared/lazyRoute";
import { preloadWorkflowChunks } from "../shared/preloadWorkflowChunks";
import type { RouterMode } from "../shared/types";

const LazyDrawer = lazy(() =>
  componentLazyImport("transaction-drawer", "react-router", "transaction", () => import("../workflows/SuspiciousTransactionDrawer"))().then((module) => ({
    default: module.SuspiciousTransactionDrawer
  }))
);

export function TransactionsPage({ routerMode, link }: { routerMode: RouterMode; link: (to: string, children: ReactNode) => ReactNode }) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Transaction | null>(null);
  const query = useQuery({ queryKey: ["transactions", routerMode, q], queryFn: () => api.transactions(routerMode, q) });
  useEffect(() => {
    void preloadWorkflowChunks("transaction", routerMode);
  }, [routerMode]);
  const suspicious = useMemo(() => query.data?.filter((item) => item.riskScore >= 70) ?? [], [query.data]);

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Monitoring</p>
          <h1>Transactions</h1>
        </div>
        {link("/transactions/report", <><BarChart3 aria-hidden="true" /> Heavy report</>)}
      </section>
      <section className="toolbar">
        <label className="search-field">
          <Search aria-hidden="true" />
          <input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Filter transactions" />
        </label>
        <span className="badge">{suspicious.length} suspicious</span>
      </section>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Risk</th>
              <th>Review</th>
            </tr>
          </thead>
          <tbody>
            {query.data?.map((transaction) => (
              <tr key={transaction.id}>
                <td>{formatDate(transaction.postedAt)}</td>
                <td>{transaction.description}</td>
                <td>{formatCents(transaction.amountCents)}</td>
                <td>{transaction.status}</td>
                <td>{transaction.riskScore}</td>
                <td>
                  <button className="button button-light" type="button" onClick={() => setSelected(transaction)}>
                    Open drawer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected ? (
        <Suspense fallback={<div className="loading-panel">Opening review drawer...</div>}>
          <LazyDrawer transaction={selected} onClose={() => setSelected(null)} />
        </Suspense>
      ) : null}
    </div>
  );
}
