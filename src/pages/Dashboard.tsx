import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, BadgeDollarSign, CreditCard, FileCheck2, Landmark } from "lucide-react";
import { api } from "../shared/api";
import { formatCents, formatDate } from "../shared/format";
import type { RouterMode } from "../shared/types";

export function DashboardPage({ routerMode }: { routerMode: RouterMode }) {
  const query = useQuery({ queryKey: ["dashboard", routerMode], queryFn: () => api.dashboard(routerMode) });

  if (query.isLoading) {
    return <div className="loading-panel">Loading finance workspace...</div>;
  }

  if (query.isError || !query.data) {
    return <div className="empty-state">Unable to load dashboard.</div>;
  }

  const totalBalance = query.data.accounts.reduce((sum, account) => sum + account.balanceCents, 0);

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Business banking operations</p>
          <h1>Dashboard</h1>
        </div>
        <span className="badge badge-muted">All data is fake</span>
      </section>

      <section className="metric-grid">
        <article className="metric-card">
          <Landmark aria-hidden="true" />
          <span>Total balance</span>
          <strong>{formatCents(totalBalance)}</strong>
        </article>
        <article className="metric-card">
          <FileCheck2 aria-hidden="true" />
          <span>Pending approvals</span>
          <strong>{query.data.pendingApprovals.length}</strong>
        </article>
        <article className="metric-card">
          <AlertCircle aria-hidden="true" />
          <span>Risk alerts</span>
          <strong>{query.data.riskAlerts.length}</strong>
        </article>
        <article className="metric-card">
          <CreditCard aria-hidden="true" />
          <span>Card reviews</span>
          <strong>{query.data.cardsRequiringAttention.length}</strong>
        </article>
      </section>

      <section className="dashboard-grid">
        <div className="panel">
          <header className="panel-header">
            <h2>Accounts</h2>
          </header>
          <div className="list">
            {query.data.accounts.map((account) => (
              <div className="list-row" key={account.id}>
                <div>
                  <strong>{account.name}</strong>
                  <span>{account.maskedNumber}</span>
                </div>
                <b>{formatCents(account.balanceCents)}</b>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <header className="panel-header">
            <h2>Approvals due</h2>
            <ArrowRight aria-hidden="true" />
          </header>
          <div className="list">
            {query.data.invoicesDueSoon.map((invoice) => (
              <div className="list-row" key={invoice.id}>
                <div>
                  <strong>{invoice.vendorName}</strong>
                  <span>Due {formatDate(invoice.dueDate)}</span>
                </div>
                <b>{formatCents(invoice.amountCents)}</b>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <header className="panel-header">
            <h2>Recent transactions</h2>
          </header>
          <div className="list">
            {query.data.recentTransactions.map((transaction) => (
              <div className="list-row" key={transaction.id}>
                <div>
                  <strong>{transaction.description}</strong>
                  <span>{transaction.status} · risk {transaction.riskScore}</span>
                </div>
                <b>{formatCents(transaction.amountCents)}</b>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <header className="panel-header">
            <h2>Risk alerts</h2>
            <BadgeDollarSign aria-hidden="true" />
          </header>
          <div className="list">
            {query.data.riskAlerts.map((alert) => (
              <div className="list-row" key={alert.id}>
                <div>
                  <strong>{alert.title}</strong>
                  <span>{alert.entity}</span>
                </div>
                <span className="status-chip">{alert.severity}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
