import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CreditCard, Snowflake, UnlockKeyhole } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../shared/api";
import { formatCents } from "../shared/format";
import { getOrCreateIdempotencyKey } from "../shared/idempotencyKeyStore";
import { getSessionSnapshot } from "../shared/sessionSimulation";
import { guardSensitiveMutation, handleBlockedMutationGuard } from "../shared/sensitiveMutationGuard";
import { restoreWorkflowDraft, saveWorkflowDraft } from "../shared/workflowDraftStore";
import {
  DuplicateSubmitPreventedNotice,
  LazyBoundaryDebugBadge,
  RequiredUpdateGate,
  SensitiveActionBlockedDialog,
  WorkflowAutosaveRestoredNotice
} from "../components/UpdateSurfaces";

interface CardLimitDraft {
  spendLimitCents: number;
  categories: string[];
}

interface CardLimitControls {
  spendLimit: number;
  categories: string;
}

interface CardLimitDraftState {
  controls: CardLimitControls;
  restored: boolean;
  readyDraftId: string | null;
}

type CardControlAction = "freeze" | "unfreeze" | "limit";
type CardLimitSource = CardLimitDraft & { id: string };

const defaultCardLimitControls: CardLimitControls = {
  spendLimit: 0,
  categories: "Travel, Software"
};

const cardIntentByAction = {
  freeze: "card.freeze",
  unfreeze: "card.unfreeze",
  limit: "card.limit.update"
} as const;

function cardLimitDraftId(cardId: string) {
  return `card-limit-${cardId}`;
}

function controlsFromLimitDraft(draft: CardLimitDraft): CardLimitControls {
  return {
    spendLimit: draft.spendLimitCents / 100,
    categories: draft.categories.join(", ")
  };
}

function limitDraftFromControls({ categories, spendLimit }: CardLimitControls): CardLimitDraft {
  return {
    spendLimitCents: Math.round(spendLimit * 100),
    categories: categories.split(",").map((item) => item.trim()).filter(Boolean)
  };
}

function restoredCardLimitDraftState(draftId: string, routerMode: "react-router"): CardLimitDraftState {
  const restoredDraft = restoreWorkflowDraft<CardLimitDraft>(draftId, routerMode);
  const controls = restoredDraft.status === "restored" ? controlsFromLimitDraft(restoredDraft.draft.formValues) : null;
  return {
    controls: controls ?? defaultCardLimitControls,
    restored: Boolean(controls),
    readyDraftId: controls ? draftId : null
  };
}

function hydrateCardLimitDraftState(
  state: CardLimitDraftState,
  draftId: string,
  cardId: string,
  card?: CardLimitSource
): CardLimitDraftState {
  const controls = state.readyDraftId === draftId || card?.id !== cardId ? null : controlsFromLimitDraft(card);
  return controls ? { controls, restored: state.restored, readyDraftId: draftId } : state;
}

function canSaveCardLimitDraft(state: CardLimitDraftState, draftId: string) {
  return state.readyDraftId === draftId;
}

function saveCardLimitDraft({
  cardId,
  draftId,
  formValues,
  limitKey,
  organizationId,
  routerMode,
  userId
}: {
  cardId: string;
  draftId: string;
  formValues: CardLimitDraft;
  limitKey: string;
  organizationId: string;
  routerMode: "react-router";
  userId: string;
}) {
  saveWorkflowDraft({
    id: draftId,
    workflowType: "card",
    routerMode,
    currentPath: `/cards/${cardId}`,
    currentStep: "controls",
    formValues,
    userId,
    organizationId,
    idempotencyKey: limitKey,
    mutationIntent: "card.limit.update"
  });
}

function blockCardActionIfNeeded({
  action,
  mutationPending,
  onBlocked,
  onRequiredUpdate,
  routerMode
}: {
  action: CardControlAction;
  mutationPending: boolean;
  onBlocked: (message: string) => void;
  onRequiredUpdate: (message: string | null) => void;
  routerMode: "react-router";
}) {
  const guard = guardSensitiveMutation({
    routerMode,
    intent: cardIntentByAction[action],
    workflowType: "card",
    currentRoute: window.location.pathname,
    dirtyForm: action === "limit",
    mutationPending,
    mfaPending: false,
    idempotencyKeyPresent: true,
    lastInteractionAt: Date.now()
  });
  return handleBlockedMutationGuard(guard, "Card changes are paused.", onRequiredUpdate, onBlocked);
}

function runCardControlAction(
  action: CardControlAction,
  {
    runLimit,
    runStatusAction
  }: {
    runLimit: () => void;
    runStatusAction: (action: Exclude<CardControlAction, "limit">) => void;
  }
) {
  if (action === "limit") {
    runLimit();
    return;
  }
  runStatusAction(action);
}

function useCardLimitDraft({
  cardId,
  card,
  draftId,
  limitKey,
  routerMode,
  session
}: {
  cardId: string;
  card?: CardLimitSource;
  draftId: string;
  limitKey: string;
  routerMode: "react-router";
  session: ReturnType<typeof getSessionSnapshot>;
}) {
  const [draftState, setDraftState] = useState<CardLimitDraftState>(() => restoredCardLimitDraftState(draftId, routerMode));
  const formValues = useMemo(() => limitDraftFromControls(draftState.controls), [draftState.controls]);
  const draftReadyToSave = canSaveCardLimitDraft(draftState, draftId);

  useEffect(() => {
    setDraftState(restoredCardLimitDraftState(draftId, routerMode));
  }, [draftId, routerMode]);

  useEffect(() => {
    setDraftState((state) => hydrateCardLimitDraftState(state, draftId, cardId, card));
  }, [card, cardId, draftId]);

  useEffect(() => {
    if (!draftReadyToSave) {
      return;
    }
    saveCardLimitDraft({
      cardId,
      draftId,
      formValues,
      limitKey,
      organizationId: session.organization.id,
      routerMode,
      userId: session.user.id
    });
  }, [cardId, draftId, draftReadyToSave, formValues, limitKey, routerMode, session.organization.id, session.user.id]);

  function setSpendLimit(spendLimit: number) {
    setDraftState((state) => ({ ...state, controls: { ...state.controls, spendLimit } }));
  }

  function setCategories(categories: string) {
    setDraftState((state) => ({ ...state, controls: { ...state.controls, categories } }));
  }

  return {
    categories: draftState.controls.categories,
    formValues,
    restored: draftState.restored,
    setCategories,
    setSpendLimit,
    spendLimit: draftState.controls.spendLimit
  };
}

export function Component() {
  const params = useParams();
  const cardId = params.cardId ?? "";
  const draftId = cardLimitDraftId(cardId);
  const routerMode = "react-router" as const;
  const session = getSessionSnapshot();
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["card", routerMode, cardId], queryFn: () => api.card(routerMode, cardId) });
  const [blocked, setBlocked] = useState<string | null>(null);
  const [requiredGate, setRequiredGate] = useState<string | null>(null);
  const [deduped, setDeduped] = useState(false);
  const freezeKey = useMemo(() => getOrCreateIdempotencyKey("card.freeze", cardId), [cardId]);
  const unfreezeKey = useMemo(() => getOrCreateIdempotencyKey("card.unfreeze", cardId), [cardId]);
  const limitKey = useMemo(() => getOrCreateIdempotencyKey("card.limit.update", cardId), [cardId]);
  const { categories, formValues, restored, setCategories, setSpendLimit, spendLimit } = useCardLimitDraft({
    cardId,
    card: query.data,
    draftId,
    limitKey,
    routerMode,
    session
  });

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
      api.updateCardLimits(routerMode, cardId, limitKey, formValues),
    meta: { sensitive: true, intent: "card.limit.update" },
    onSuccess(response) {
      setDeduped(response.deduped);
      queryClient.invalidateQueries({ queryKey: ["cards", routerMode] });
      queryClient.invalidateQueries({ queryKey: ["card", routerMode, cardId] });
    }
  });

  function guarded(action: CardControlAction) {
    if (blockCardActionIfNeeded({
      action,
      mutationPending: cardAction.isPending || limitMutation.isPending,
      onBlocked: setBlocked,
      onRequiredUpdate: setRequiredGate,
      routerMode
    })) {
      return;
    }
    runCardControlAction(action, {
      runLimit: () => limitMutation.mutate(),
      runStatusAction: (statusAction) => cardAction.mutate(statusAction)
    });
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
