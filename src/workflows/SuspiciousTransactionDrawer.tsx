import { AlertTriangle, X } from "lucide-react";
import type { Transaction } from "../shared/domain";
import { formatCents, formatDate } from "../shared/format";

export function SuspiciousTransactionDrawer({ transaction, onClose }: { transaction: Transaction; onClose: () => void }) {
  return (
    <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="txn-drawer-title">
      <header>
        <div>
          <p className="eyebrow">Risk review</p>
          <h2 id="txn-drawer-title">{transaction.description}</h2>
        </div>
        <button className="icon-button" type="button" aria-label="Close transaction detail" onClick={onClose}>
          <X aria-hidden="true" />
        </button>
      </header>
      <div className="detail-grid single">
        <div className="summary-tile">
          <span>Amount</span>
          <strong>{formatCents(transaction.amountCents)}</strong>
        </div>
        <div className="summary-tile">
          <span>Posted</span>
          <strong>{formatDate(transaction.postedAt)}</strong>
        </div>
        <div className="summary-tile">
          <span>Counterparty</span>
          <strong>{transaction.maskedCounterparty}</strong>
        </div>
        <div className="summary-tile">
          <AlertTriangle aria-hidden="true" />
          <span>Risk score</span>
          <strong>{transaction.riskScore}</strong>
        </div>
      </div>
    </aside>
  );
}
