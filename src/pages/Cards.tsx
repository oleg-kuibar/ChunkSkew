import { useQuery } from "@tanstack/react-query";
import { CreditCard, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { api } from "../shared/api";
import { formatCents } from "../shared/format";
import { preloadWorkflowChunks } from "../shared/preloadWorkflowChunks";
import type { RouterMode } from "../shared/types";

export function CardsPage({ routerMode, link }: { routerMode: RouterMode; link: (to: string, children: ReactNode) => ReactNode }) {
  const query = useQuery({ queryKey: ["cards", routerMode], queryFn: () => api.cards(routerMode) });
  useEffect(() => {
    void preloadWorkflowChunks("card", routerMode);
  }, [routerMode]);

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Spend controls</p>
          <h1>Cards</h1>
        </div>
      </section>
      <section className="card-grid">
        {query.data?.map((card) => (
          <article className="entity-card" key={card.id}>
            <header>
              <CreditCard aria-hidden="true" />
              <span className="status-chip">{card.status}</span>
            </header>
            <h2>{card.holder}</h2>
            <p>{card.maskedPan}</p>
            <div className="entity-card-metrics">
              <span>Limit {formatCents(card.spendLimitCents)}</span>
              <span>Spent {formatCents(card.spentThisMonthCents)}</span>
            </div>
            <footer>
              <span>
                <ShieldCheck aria-hidden="true" />
                {card.attention}
              </span>
              {link(`/cards/${card.id}`, "Manage")}
            </footer>
          </article>
        ))}
      </section>
    </div>
  );
}
