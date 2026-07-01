import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Lock, ShieldCheck, UserCog } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "../shared/api";
import { getOrCreateIdempotencyKey } from "../shared/idempotencyKeyStore";
import { expireSession, getSessionSnapshot, switchRole } from "../shared/sessionSimulation";
import { guardSensitiveMutation, handleBlockedMutationGuard } from "../shared/sensitiveMutationGuard";
import type { RouterMode, SessionSnapshot } from "../shared/types";
import { DuplicateSubmitPreventedNotice, RequiredUpdateGate, SensitiveActionBlockedDialog } from "../components/UpdateSurfaces";

const roles: SessionSnapshot["user"]["role"][] = ["owner", "admin", "finance-manager", "employee", "auditor"];

export function SettingsPage({ routerMode }: { routerMode: RouterMode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState(getSessionSnapshot());
  const [blocked, setBlocked] = useState<string | null>(null);
  const [requiredGate, setRequiredGate] = useState<string | null>(null);
  const [deduped, setDeduped] = useState(false);
  const idempotencyKey = useMemo(() => getOrCreateIdempotencyKey("api-key.generate", "settings"), []);
  const roleChangeKey = useMemo(() => getOrCreateIdempotencyKey("role.change", "settings-role"), []);
  const keys = useQuery({ queryKey: ["api-keys", routerMode], queryFn: () => api.apiKeys(routerMode) });
  const generateKey = useMutation({
    mutationFn: () => api.generateApiKey(routerMode, idempotencyKey, "Treasury webhook test"),
    meta: { sensitive: true, intent: "api-key.generate" },
    onSuccess(response) {
      setDeduped(response.deduped);
      queryClient.invalidateQueries({ queryKey: ["api-keys", routerMode] });
    }
  });
  const changeRoleMutation = useMutation({
    mutationFn: (role: SessionSnapshot["user"]["role"]) => api.changeRole(routerMode, roleChangeKey, role),
    meta: { sensitive: true, intent: "role.change" },
    onSuccess(response) {
      switchRole(response.result.user.role as SessionSnapshot["user"]["role"]);
      setSession(getSessionSnapshot());
    }
  });

  function chooseRole(role: SessionSnapshot["user"]["role"]) {
    const guard = guardSensitiveMutation({
      routerMode,
      intent: "role.change",
      workflowType: "admin",
      currentRoute: window.location.pathname,
      dirtyForm: false,
      mutationPending: changeRoleMutation.isPending,
      mfaPending: false,
      idempotencyKeyPresent: true,
      lastInteractionAt: Date.now()
    });
    if (handleBlockedMutationGuard(guard, "Role changes are paused.", setRequiredGate, setBlocked)) {
      return;
    }
    changeRoleMutation.mutate(role);
  }

  function simulateExpiredSession() {
    expireSession();
    setSession(getSessionSnapshot());
  }

  function guardedKeyGeneration() {
    const guard = guardSensitiveMutation({
      routerMode,
      intent: "api-key.generate",
      workflowType: "admin",
      currentRoute: window.location.pathname,
      dirtyForm: false,
      mutationPending: generateKey.isPending,
      mfaPending: false,
      idempotencyKeyPresent: true,
      lastInteractionAt: Date.now()
    });
    if (handleBlockedMutationGuard(guard, "Admin changes are paused.", setRequiredGate, setBlocked)) {
      return;
    }
    generateKey.mutate();
  }

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Administration</p>
          <h1>Settings</h1>
        </div>
      </section>
      {requiredGate ? <RequiredUpdateGate routerMode={routerMode} message={requiredGate} /> : null}
      <DuplicateSubmitPreventedNotice visible={deduped} />

      <section className="settings-grid">
        <div className="panel">
          <header className="panel-header">
            <h2>Roles and permissions</h2>
            <UserCog aria-hidden="true" />
          </header>
          <div className="segmented">
            {roles.map((role) => (
              <button key={role} type="button" className={session.user.role === role ? "active" : ""} onClick={() => chooseRole(role)}>
                {role}
              </button>
            ))}
          </div>
          <div className="permission-list">
            {session.permissions.map((permission) => (
              <span className="status-chip" key={permission}>
                <ShieldCheck aria-hidden="true" />
                {permission}
              </span>
            ))}
          </div>
        </div>

        <div className="panel">
          <header className="panel-header">
            <h2>Session simulation</h2>
            <Lock aria-hidden="true" />
          </header>
          <p>{session.authenticated ? "Session active" : "Session expired"}</p>
          <button className="button button-secondary" type="button" onClick={simulateExpiredSession}>
            Expire session
          </button>
        </div>

        <div className="panel wide-panel">
          <header className="panel-header">
            <h2>Mock API keys</h2>
            <KeyRound aria-hidden="true" />
          </header>
          <div className="list">
            {keys.data?.map((key) => (
              <div className="list-row" key={key.id}>
                <div>
                  <strong>{key.name}</strong>
                  <span>{key.prefix}</span>
                </div>
                <span>{new Date(key.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
          <button className="button" type="button" onClick={guardedKeyGeneration} disabled={generateKey.isPending}>
            <KeyRound aria-hidden="true" />
            Generate test key
          </button>
        </div>
      </section>
      {blocked ? <SensitiveActionBlockedDialog message={blocked} onClose={() => setBlocked(null)} /> : null}
    </div>
  );
}
