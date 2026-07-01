import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CreditCard, Snowflake, UnlockKeyhole } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../shared/api";
import { formatCents } from "../shared/format";
import { getOrCreateIdempotencyKey } from "../shared/idempotencyKeyStore";
import { getSessionSnapshot } from "../shared/sessionSimulation";
import { guardSensitiveMutation } from "../shared/sensitiveMutationGuard";
import { restoreWorkflowDraft, saveWorkflowDraft } from "../shared/workflowDraftStore";
import {
  DuplicateSubmitPreventedNotice,
  LazyBoundaryDebugBadge,
  RequiredUpdateGate,
  SensitiveActionBlockedDialog,
  WorkflowAutosaveRestoredNotice
} from "../components/UpdateSurfaces";

export function Component() {
  const params = useParams();
  const cardId = params.cardId ?? "";
  const routerMode = "react-router" as const;
  const session = getSessionSnapshot();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["card", routerMode, cardId], queryFn: () => api.card(routerMode, cardId) });
  const [spendLimit, setSpendLimit] = useState(0);
  const [categories, setCategories] = useState("Travel, Software");
  const [restored, setRestored] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);
  const [requiredGate, setRequiredGate] = useState<string | null>(null);
  const [deduped, setDeduped] = useState(false);
  const [draftApplied, setDraftApplied] = useState(false);
  const freezeKey = useMemo(() => getOrCreateIdempotencyKey("card.freeze", cardId), [cardId]);
  const unfreezeKey = useMemo(() => getOrCreateIdempotencyKey("card.unfreeze", cardId), [cardId]);
  const limitKey = useMemo(() => getOrCreateIdempotencyKey("card.limit.update", cardId), [cardId]);

  useEffect(() => {
    const restoredDraft = restoreWorkflowDraft<{ spendLimitCents: number; categories: string[] }>(`card-limit-${cardId}`, routerMode);
    if (restoredDraft.status === "restored") {
      setSpendLimit(restoredDraft.draft.formValues.spendLimitCents / 100);
      setCategories(restoredDraft.draft.formValues.categories.join(", "));
      setRestored(true);
      setDraftApplied(true);
    }
  }, [cardId, routerMode]);

  useEffect(() => {
    if (draftApplied) {
      return;
    }
    if (query.data) {
      setSpendLimit(query.data.spendLimitCents / 100);
      setCategories(query.data.categories.join(", "));
    }
  }, [draftApplied, query.data]);

  useEffect(() => {
    saveWorkflowDraft({
      id: `card-limit-${cardId}`,
      workflowType: "card",
      routerMode,
      currentPath: `/cards/${cardId}`,
      currentStep: "controls",
      formValues: {
        spendLimitCents: Math.round(spendLimit * 100),
        categories: categories.split(",").map((item) => item.trim()).filter(Boolean)
      },
      userId: session.user.id,
      organizationId: session.organization.id,
      idempotencyKey: limitKey,
      mutationIntent: "card.limit.update"
    });
  }, [cardId, categories, limitKey, routerMode, session.organization.id, session.user.id, spendLimit]);

  const cardAction = useMutation({
    mutationFn: (action: "freeze" | "unfreeze") => api.cardAction(routerMode, cardId, action, action === "freeze" ? freezeKey : unfreezeKey),
    meta: { sensitive: true, intent: "card.freeze" },
    onSuccess(response) {
      setDeduped(response.deduped);
      queryClient.invalidateQueries({ queryKey: ["cards", routerMode] });
      queryClient.invalidateQueries({ queryKey: ["card", routerMode, cardId] });
    }
  });

  const limitMutation = useMutation({
    mutationFn: () =>
      api.updateCardLimits(routerMode, cardId, limitKey, {
        spendLimitCents: Math.round(spendLimit * 100),
        categories: categories.split(",").map((item) => item.trim()).filter(Boolean)
      }),
    meta: { sensitive: true, intent: "card.limit.update" },
    onSuccess(response) {
      setDeduped(response.deduped);
      queryClient.invalidateQueries({ queryKey: ["cards", routerMode] });
      queryClient.invalidateQueries({ queryKey: ["card", routerMode, cardId] });
    }
  });

  function guarded(action: "freeze" | "unfreeze" | "limit") {
    const intent = action === "limit" ? "card.limit.update" : action === "freeze" ? "card.freeze" : "card.unfreeze";
    const guard = guardSensitiveMutation({
      routerMode,
      intent,
      workflowType: "card",
      currentRoute: window.location.pathname,
      dirtyForm: action === "limit",
      mutationPending: cardAction.isPending || limitMutation.isPending,
      mfaPending: false,
      idempotencyKeyPresent: true,
      lastInteractionAt: Date.now()
    });
    if (!guard.allowed) {
      if (guard.code === "required-update") {
        setRequiredGate(guard.reason ?? null);
      } else {
        setBlocked(guard.reason ?? "Card changes are paused.");
      }
      return;
    }
    if (action === "limit") {
      limitMutation.mutate();
    } else {
      cardAction.mutate(action);
    }
  }

  if (query.isLoading) {
    return <div className="loading-panel">Loading card controls...</div>;
  }
  if (!query.data) {
    return <div className="empty-state">Card not found.</div>;
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Card detail</p>
          <h1>{query.data.holder}</h1>
        </div>
        <LazyBoundaryDebugBadge label="card-detail route" />
      </section>
      {restored ? <WorkflowAutosaveRestoredNotice /> : null}
      {requiredGate ? <RequiredUpdateGate routerMode={routerMode} message={requiredGate} /> : null}
      <DuplicateSubmitPreventedNotice visible={deduped} />
      <section className="detail-grid">
        <div className="summary-tile">
          <CreditCard aria-hidden="true" />
          <span>Card</span>
          <strong>{query.data.maskedPan}</strong>
        </div>
        <div className="summary-tile">
          <span>Status</span>
          <strong>{query.data.status}</strong>
        </div>
        <div className="summary-tile">
          <span>Monthly limit</span>
          <strong>{formatCents(query.data.spendLimitCents)}</strong>
        </div>
        <div className="summary-tile">
          <span>Spent</span>
          <strong>{formatCents(query.data.spentThisMonthCents)}</strong>
        </div>
      </section>
      <section className="workflow-surface">
        <div className="form-grid">
          <label>
            Spend limit
            <input type="number" value={spendLimit} onChange={(event) => setSpendLimit(Number(event.target.value))} />
          </label>
          <label>
            Merchant categories
            <input value={categories} onChange={(event) => setCategories(event.target.value)} />
          </label>
        </div>
        <footer className="workflow-actions left">
          <button className="button" type="button" onClick={() => guarded("limit")} disabled={limitMutation.isPending}>
            <CheckCircle2 aria-hidden="true" />
            Save controls
          </button>
          <button className="button button-secondary" type="button" onClick={() => guarded(query.data.status === "frozen" ? "unfreeze" : "freeze")}>
            {query.data.status === "frozen" ? <UnlockKeyhole aria-hidden="true" /> : <Snowflake aria-hidden="true" />}
            {query.data.status === "frozen" ? "Unfreeze card" : "Freeze card"}
          </button>
        </footer>
      </section>
      {blocked ? <SensitiveActionBlockedDialog message={blocked} onClose={() => setBlocked(null)} /> : null}
    </div>
  );
}
