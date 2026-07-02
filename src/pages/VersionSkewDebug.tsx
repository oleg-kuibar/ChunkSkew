import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Bug, CheckCircle2, FileClock, Play, RefreshCcw, ShieldCheck, Trash2, WalletCards } from "lucide-react";
import { useEffect, useState } from "react";
import { AssetRetentionWarning } from "../components/UpdateSurfaces";
import { apiFetch } from "../shared/apiClient";
import { setLocalSkewMode } from "../shared/assetRetentionSimulator";
import { readPreloadStatuses } from "../shared/preloadWorkflowChunks";
import { cx } from "../shared/format";
import { writeGuidedScenarioState } from "../shared/guidedScenarioState";
import { getBundledReleaseIdentity } from "../shared/releaseIdentity";
import { debugRouteHref } from "../shared/routerLinks";
import { seedIncompatibleKybDraft } from "../shared/workflowDraftStore";
import { clearTelemetryEvents } from "../shared/telemetry";
import { applyReleasePayload, checkForVersionUpdate, getVersionState } from "../shared/versionCheckClient";
import type { ReleaseMetadata, RouterMode, SkewMode } from "../shared/types";
import { AuditEventTable } from "../components/AuditEventTable";

const modes: SkewMode[] = [
  "no-affinity",
  "affinity",
  "asset-retention",
  "broken",
  "compatibility-window-expired",
  "api-contract-incompatible"
];

const guidedScenarios = [
  {
    id: "payment-safe-refresh",
    title: "Payment safe refresh",
    mode: "asset-retention" as SkewMode,
    modeLabel: "Retained assets",
    href: "/payments/create/recipient",
    startLabel: "Payment recipient step",
    icon: WalletCards,
    action: "Prepare payment recovery",
    outcome: "Autosave a payment, force a required update, then refresh safely without duplicate submit.",
    steps: ["Start with retained assets", "Fill the payment memo", "Force required update before submit"],
    targetStepIndex: 1
  },
  {
    id: "missing-chunk",
    title: "Missing chunk fallback",
    mode: "broken" as SkewMode,
    modeLabel: "Missing chunks",
    href: "/payments/create/review",
    startLabel: "Payment review step",
    icon: Bug,
    action: "Prepare missing chunk fallback",
    outcome: "Open a lazy review route while old chunks are unavailable and see controlled recovery.",
    steps: ["Switch to broken assets", "Open lazy payment review", "Confirm fallback and reload-loop prevention"],
    targetStepIndex: 2
  },
  {
    id: "kyb-draft",
    title: "KYB incompatible draft",
    mode: "asset-retention" as SkewMode,
    modeLabel: "Retained assets",
    href: "/kyb/review",
    startLabel: "KYB review step",
    icon: FileClock,
    action: "Prepare KYB draft review",
    outcome: "Seed an incompatible KYB draft and verify the app asks for review instead of submitting.",
    steps: ["Seed incompatible draft", "Open KYB review", "Review the compatibility fallback"],
    targetStepIndex: 2,
    seedKybDraft: true
  },
  {
    id: "api-contract",
    title: "API contract blocking",
    mode: "api-contract-incompatible" as SkewMode,
    modeLabel: "API contract block",
    href: "/payments/create/mfa",
    startLabel: "Payment MFA step",
    icon: ShieldCheck,
    action: "Prepare API contract block",
    outcome: "Open a risky payment step with an incompatible API contract and watch mutation get paused.",
    steps: ["Switch API contract", "Verify MFA", "Submit to see the guard"],
    targetStepIndex: 1
  },
  {
    id: "asset-strategy",
    title: "Asset retention safety",
    mode: "asset-retention" as SkewMode,
    modeLabel: "Retained assets",
    href: "/transactions/report",
    startLabel: "Transaction report route",
    icon: CheckCircle2,
    action: "Prepare asset retention proof",
    outcome: "Open a heavy lazy report while old assets are retained so the route loads instead of falling back.",
    steps: ["Switch to retained assets", "Open lazy transaction report", "Confirm retained assets prevent fallback"],
    targetStepIndex: 2
  }
];

type GuidedScenario = (typeof guidedScenarios)[number];

interface DebugState {
  mode: SkewMode;
  activeReleaseId: string;
  latestReleaseId: string;
  updateSeverity: string;
  apiContractVersion: string;
  version: ReleaseMetadata;
}

async function prepareGuidedScenario(routerMode: RouterMode, scenario: GuidedScenario) {
  await apiFetch<DebugState>("/api/debug/version-skew/reset", routerMode, { method: "POST" });
  resetBrowserSimulationState(routerMode);
  const data = await apiFetch<DebugState>("/api/debug/version-skew/mode", routerMode, {
    method: "POST",
    body: JSON.stringify({ mode: scenario.mode })
  });
  return { data, scenario };
}

function finishGuidedScenario(routerMode: RouterMode, data: DebugState, scenario: GuidedScenario) {
  setLocalSkewMode(routerMode, data.mode);
  applyReleasePayload(routerMode, data.version);
  if (scenario.seedKybDraft) {
    seedIncompatibleKybDraft(routerMode);
  }
  writeGuidedScenarioState({
    id: scenario.id,
    title: scenario.title,
    outcome: scenario.outcome,
    href: scenario.href,
    steps: scenario.steps,
    targetStepIndex: scenario.targetStepIndex
  });
  window.location.assign(debugRouteHref(scenario.href, routerMode));
}

export function VersionSkewDebugPage({ routerMode }: { routerMode: RouterMode }) {
  const queryClient = useQueryClient();
  const [, setTick] = useState(0);
  const query = useQuery({ queryKey: ["debug-version-skew", routerMode], queryFn: () => apiFetch<DebugState>("/api/debug/version-skew", routerMode) });
  const mutation = useMutation({
    mutationFn: (mode: SkewMode) =>
      apiFetch<DebugState>("/api/debug/version-skew/mode", routerMode, {
        method: "POST",
        body: JSON.stringify({ mode })
      }),
    onSuccess(data) {
      setLocalSkewMode(routerMode, data.mode);
      void checkForVersionUpdate(routerMode, "debug-mode-change");
      queryClient.invalidateQueries({ queryKey: ["debug-version-skew", routerMode] });
    }
  });
  const resetMutation = useMutation({
    mutationFn: () =>
      apiFetch<DebugState>("/api/debug/version-skew/reset", routerMode, {
        method: "POST"
      }),
    onSuccess() {
      resetBrowserSimulationState(routerMode);
      window.location.assign(debugRouteHref("/debug/version-skew?reset=1", routerMode));
    }
  });
  const scenarioMutation = useMutation({
    mutationFn: (scenario: GuidedScenario) => prepareGuidedScenario(routerMode, scenario),
    onSuccess: ({ data, scenario }) => finishGuidedScenario(routerMode, data, scenario)
  });
  useEffect(() => {
    const interval = window.setInterval(() => setTick((value) => value + 1), 2000);
    return () => window.clearInterval(interval);
  }, []);
  const versionState = getVersionState(routerMode);
  const bundle = getBundledReleaseIdentity(routerMode);
  const statuses = readPreloadStatuses();
  const searchParams = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
  const resetConfirmed = searchParams.get("reset") === "1";
  const suggestedScenarioId = searchParams.get("scenario") ?? undefined;
  const visibleScenarios = suggestedScenarioId
    ? [...guidedScenarios].sort((a, b) => Number(b.id === suggestedScenarioId) - Number(a.id === suggestedScenarioId))
    : guidedScenarios;
  const runGuidedScenario = (scenario: GuidedScenario) => scenarioMutation.mutate(scenario);

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Version skew simulation</p>
          <h1>Lab controls</h1>
        </div>
        <button
          className="button"
          type="button"
          disabled={resetMutation.isPending}
          onClick={() => resetMutation.mutate()}
        >
          <RefreshCcw aria-hidden="true" />
          {resetMutation.isPending ? "Resetting..." : "Reset simulation state"}
        </button>
      </section>

      {resetConfirmed ? (
        <div className="notice notice-success" data-testid="reset-confirmation">
          <CheckCircle2 aria-hidden="true" />
          <span>Simulation state reset. Drafts, release overrides, reload flags, and guided scenario were cleared. Debug mode and router choice stayed on.</span>
        </div>
      ) : null}

      <section className="scenario-runner" data-testid="guided-scenarios">
        <header className="section-header">
          <div>
            <p className="eyebrow">Guided path</p>
            <h2>Pick one scenario</h2>
            <p>Each card starts from a clean reset, sets the lab mode, and opens a focused example.</p>
          </div>
        </header>
        <div className="scenario-grid">
          {visibleScenarios.map((scenario) => {
            const Icon = scenario.icon;
            const suggested = scenario.id === suggestedScenarioId;
            return (
              <article className={cx("scenario-card", suggested && "active")} data-testid={`guided-scenario-${scenario.id}`} key={scenario.id}>
                <Icon aria-hidden="true" />
                <strong>{scenario.title}</strong>
                {suggested ? <span className="status-chip">Recommended next</span> : null}
                <p>{scenario.outcome}</p>
                <div className="scenario-meta" aria-label={`${scenario.title} setup: reset included, mode ${scenario.mode}, opens ${scenario.href}`}>
                  <span>Reset included</span>
                  <span title={`Mode ${scenario.mode}`}>Lab mode {scenario.modeLabel}</span>
                  <span title={`Opens ${scenario.href}`}>Starts {scenario.startLabel}</span>
                </div>
                <button className="button button-light" type="button" disabled={mutation.isPending || scenarioMutation.isPending} onClick={() => runGuidedScenario(scenario)}>
                  <Play aria-hidden="true" />
                  {scenarioMutation.isPending ? "Preparing..." : scenario.action}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <details className="advanced-diagnostics" data-testid="advanced-diagnostics">
        <summary>
          <div>
            <p className="eyebrow">Advanced diagnostics</p>
            <h2>Manual controls</h2>
            <p>Use these when you want to inspect the underlying skew modes, release state, preloads, telemetry, and audit trail.</p>
          </div>
        </summary>

        <div className="advanced-diagnostics-body">
          <section className="mode-grid" data-testid="deployment-modes">
            {modes.map((mode) => (
              <button
                key={mode}
                className={cx("mode-card", query.data?.mode === mode && "active")}
                type="button"
                onClick={() => mutation.mutate(mode)}
              >
                <Bug aria-hidden="true" />
                <strong>{mode}</strong>
                <span>{modeCopy(mode)}</span>
              </button>
            ))}
          </section>

          <AssetRetentionWarning active={versionState.latest.skewMode === "asset-retention" || query.data?.mode === "asset-retention"} />

          <section className="detail-grid">
            <div className="summary-tile">
              <span>Loaded bundle</span>
              <strong>{bundle.releaseId}</strong>
            </div>
            <div className="summary-tile">
              <span>Session release</span>
              <strong>{versionState.current.releaseId}</strong>
            </div>
            <div className="summary-tile">
              <span>Latest release</span>
              <strong>{versionState.latest.releaseId}</strong>
            </div>
            <div className="summary-tile">
              <span>Severity</span>
              <strong>{versionState.updateSeverity}</strong>
            </div>
            <div className="summary-tile">
              <span>API contract</span>
              <strong>{versionState.apiContractCompatible ? "compatible" : "blocked"}</strong>
            </div>
          </section>

          <section className="toolbar">
            <button className="button button-light" type="button" onClick={() => void checkForVersionUpdate(routerMode, "manual-debug")}>
              <RefreshCcw aria-hidden="true" />
              Check version
            </button>
            <button className="button button-secondary" type="button" onClick={() => seedIncompatibleKybDraft(routerMode)}>
              <AlertTriangle aria-hidden="true" />
              Seed incompatible KYB draft
            </button>
            <button
              className="button button-light"
              type="button"
              onClick={() => {
                clearTelemetryEvents();
                setTick((value) => value + 1);
              }}
            >
              <Trash2 aria-hidden="true" />
              Clear telemetry
            </button>
          </section>

          <section className="table-section">
            <header className="section-header">
              <div>
                <h2>Workflow chunk preload table</h2>
                <p>Routes needed to finish current workflows.</p>
              </div>
              <span className="status-chip">
                <CheckCircle2 aria-hidden="true" />
                {statuses.length} entries
              </span>
            </header>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Route</th>
                    <th>Workflow</th>
                    <th>Lazy mechanism</th>
                    <th>Status</th>
                    <th>Release</th>
                    <th>Required</th>
                    <th>Error</th>
                  </tr>
                </thead>
                <tbody>
                  {statuses.map((status) => (
                    <tr key={`${status.route}-${status.releaseId}`} data-testid={`preload-row-${status.route}`}>
                      <td>{status.route}</td>
                      <td>{status.workflowType}</td>
                      <td>{status.lazyMechanism}</td>
                      <td>{status.status}</td>
                      <td>{status.releaseId}</td>
                      <td>{status.requiredToFinishWorkflow ? "yes" : "no"}</td>
                      <td>{status.lastPreloadError ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <AuditEventTable routerMode={routerMode} />
        </div>
      </details>
    </div>
  );
}

function resetBrowserSimulationState(routerMode: RouterMode) {
  const prefix = "chunk-skew-finance:";
  for (const storage of [window.localStorage, window.sessionStorage]) {
    const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter(
      (key): key is string => Boolean(key?.startsWith(prefix))
    );
    for (const key of keys) {
      storage.removeItem(key);
    }
  }
  window.localStorage.setItem(`${prefix}debug`, "1");
  window.localStorage.setItem(`${prefix}router-mode`, routerMode);
}

function modeCopy(mode: SkewMode) {
  const copy: Record<SkewMode, string> = {
    "no-affinity": "Latest shell, old chunks may disappear.",
    affinity: "Client stays on original deployment.",
    "asset-retention": "Old chunks remain during window.",
    broken: "Old chunks are missing on purpose.",
    "compatibility-window-expired": "Retention window has expired.",
    "api-contract-incompatible": "Risky mutations become read-only."
  };
  return copy[mode];
}
