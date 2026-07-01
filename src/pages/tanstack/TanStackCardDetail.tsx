import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Snowflake } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "../../shared/api";
import { formatCents } from "../../shared/format";
import { getOrCreateIdempotencyKey } from "../../shared/idempotencyKeyStore";
import { guardSensitiveMutation, handleBlockedMutationGuard } from "../../shared/sensitiveMutationGuard";
import { DuplicateSubmitPreventedNotice, RequiredUpdateGate, SensitiveActionBlockedDialog } from "../../components/UpdateSurfaces";

export function TanStackCardDetail({ cardId }: { cardId: string }) {
  const routerMode = "tanstack-router" as const;
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["card", routerMode, cardId], queryFn: () => api.card(routerMode, cardId) });
  const [blocked, setBlocked] = useState<string | null>(null);
  const [requiredGate, setRequiredGate] = useState<string | null>(null);
  const [deduped, setDeduped] = useState(false);
  const freezeKey = useMemo(() => getOrCreateIdempotencyKey("card.freeze", cardId), [cardId]);
  const mutation = useMutation({
    mutationFn: () => api.cardAction(routerMode, cardId, "freeze", freezeKey),
    meta: { sensitive: true, intent: "card.freeze" },
    onSuccess(response) {
      setDeduped(response.deduped);
      queryClient.invalidateQueries({ queryKey: ["cards", routerMode] });
      queryClient.invalidateQueries({ queryKey: ["card", routerMode, cardId] });
    }
  });

  function freeze() {
    const guard = guardSensitiveMutation({
      routerMode,
      intent: "card.freeze",
      workflowType: "card",
      currentRoute: window.location.pathname,
      dirtyForm: false,
      mutationPending: mutation.isPending,
      mfaPending: false,
      idempotencyKeyPresent: true,
      lastInteractionAt: Date.now()
    });
    if (handleBlockedMutationGuard(guard, "Card changes are paused.", setRequiredGate, setBlocked)) {
      return;
    }
    mutation.mutate();
  }

  if (!query.data) {
    return <div className="loading-panel">Loading card...</div>;
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">TanStack lazy card</p>
          <h1>{query.data.holder}</h1>
        </div>
      </section>
      {requiredGate ? <RequiredUpdateGate routerMode={routerMode} message={requiredGate} /> : null}
      <DuplicateSubmitPreventedNotice visible={deduped} />
      <section className="detail-grid">
        <div className="summary-tile">
          <CreditCard aria-hidden="true" />
          <span>Card</span>
          <strong>{query.data.maskedPan}</strong>
        </div>
        <div className="summary-tile">
          <span>Limit</span>
          <strong>{formatCents(query.data.spendLimitCents)}</strong>
        </div>
      </section>
      <button className="button" type="button" onClick={freeze} disabled={mutation.isPending}>
        <Snowflake aria-hidden="true" />
        Freeze card
      </button>
      {blocked ? <SensitiveActionBlockedDialog message={blocked} onClose={() => setBlocked(null)} /> : null}
    </div>
  );
}
