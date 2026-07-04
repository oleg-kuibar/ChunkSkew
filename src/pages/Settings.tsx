import { useMutation } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "../shared/api";
import { getOrCreateIdempotencyKey } from "../shared/idempotencyKeyStore";
import { guardSensitiveMutation, handleBlockedMutationGuard } from "../shared/sensitiveMutationGuard";
import type { RouterMode } from "../shared/types";
import { DuplicateSubmitPreventedNotice, RequiredUpdateGate, SensitiveActionBlockedDialog } from "../components/UpdateSurfaces";

export function SettingsPage({ routerMode }: { routerMode: RouterMode }) {
  const [blocked, setBlocked] = useState<string | null>(null);
  const [requiredGate, setRequiredGate] = useState<string | null>(null);
  const [deduped, setDeduped] = useState(false);
  const idempotencyKey = useMemo(() => getOrCreateIdempotencyKey("api-key.generate", "guarded-action"), []);
  const generateKey = useMutation({
    mutationFn: () => api.generateApiKey(routerMode, idempotencyKey, "Generated key example"),
    meta: { sensitive: true, intent: "api-key.generate" },
    onSuccess(response) {
      setDeduped(response.deduped);
    }
  });

  function guardedKeyGeneration() {
    const guard = guardSensitiveMutation({
      routerMode,
      intent: "api-key.generate",
      workflowType: "guarded",
      currentRoute: window.location.pathname,
      dirtyForm: false,
      mutationPending: generateKey.isPending,
      challengePending: false,
      idempotencyKeyPresent: true,
      lastInteractionAt: Date.now()
    });
    if (handleBlockedMutationGuard(guard, "Guarded actions are paused.", setRequiredGate, setBlocked)) {
      return;
    }
    generateKey.mutate();
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Optional</p>
          <h1>Guarded action</h1>
        </div>
      </section>
      {requiredGate ? <RequiredUpdateGate routerMode={routerMode} message={requiredGate} /> : null}
      <DuplicateSubmitPreventedNotice visible={deduped} />

      <div className="simple-proof-panel">
        <span>Protected submit</span>
        <strong>{generateKey.isPending ? "Running" : "Ready"}</strong>
        <button className="button" type="button" onClick={guardedKeyGeneration} disabled={generateKey.isPending}>
          <ShieldCheck aria-hidden="true" />
          Run guarded action
        </button>
      </div>
      {blocked ? <SensitiveActionBlockedDialog message={blocked} onClose={() => setBlocked(null)} /> : null}
    </div>
  );
}
