import { useQuery } from "@tanstack/react-query";
import { FileCheck2, ShieldAlert } from "lucide-react";
import type { ReactNode } from "react";
import { api } from "../shared/api";
import { formatCents, formatDate } from "../shared/format";
import { preloadWorkflowChunks } from "../shared/preloadWorkflowChunks";
import type { RouterMode } from "../shared/types";
import { useEffect } from "react";

export function InvoicesPage({ routerMode, link }: { routerMode: RouterMode; link: (to: string, children: ReactNode) => ReactNode }) {
  const query = useQuery({ queryKey: ["invoices", routerMode], queryFn: () => api.invoices(routerMode) });
  useEffect(() => {
    void preloadWorkflowChunks("invoice", routerMode);
  }, [routerMode]);

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Approval queue</p>
          <h1>Invoice approvals</h1>
        </div>
      </section>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Vendor</th>
              <th>Due</th>
              <th>Amount</th>
              <th>Risk</th>
              <th>Status</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {query.data?.map((invoice) => (
              <tr key={invoice.id}>
                <td>
                  <strong>{invoice.vendorName}</strong>
                </td>
                <td>{formatDate(invoice.dueDate)}</td>
                <td>{formatCents(invoice.amountCents)}</td>
                <td>
                  <span className="status-chip">
                    <ShieldAlert aria-hidden="true" />
                    {invoice.risk}
                  </span>
                </td>
                <td>{invoice.status}</td>
                <td>{link(`/invoices/${invoice.id}`, <><FileCheck2 aria-hidden="true" /> Review</>)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
