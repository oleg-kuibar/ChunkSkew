import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bug,
  CheckCircle2,
  FileClock,
  Play,
  RefreshCcw,
  ShieldCheck,
  Trash2,
  WalletCards,
  type LucideIcon
} from "lucide-react";
import { useEffect, useState } from "react";
import { AssetRetentionWarning, BuildVersionSnapshot } from "../components/UpdateSurfaces";
import { guidedScenarioCatalog, type GuidedScenarioId } from "../examples/simpleVersionSkewPatterns";
import { setLocalSkewMode } from "../shared/assetRetentionSimulator";
import { readPreloadStatuses } from "../shared/preloadWorkflowChunks";
import { cx } from "../shared/format";
import { writeGuidedScenarioState } from "../shared/guidedScenarioState";
import { getBundledReleaseIdentity } from "../shared/releaseIdentity";
import { debugRouteHref } from "../shared/routerLinks";
import { seedIncompatibleKybDraft } from "../shared/workflowDraftStore";
import { clearTelemetryEvents } from "../shared/telemetry";
import { checkForVersionUpdate, getVersionState, applyReleasePayload } from "../shared/versionCheckClient";
import {
  modeCopy,
  modeEvent,
  readDebugState,
  resetDebugState,
  setDebugModeState,
  skewModes as modes,
  type DebugState
} from "../shared/labStateControls";
import type { RouterMode, SkewMode } from "../shared/types";
import { AuditEventTable } from "../components/AuditEventTable";

const scenarioIcons: Record<GuidedScenarioId, LucideIcon> = {
  "payment-safe-refresh": WalletCards,
  "missing-chunk": Bug,
  "kyb-draft": FileClock,
  "api-contract": ShieldCheck,
  "asset-strategy": CheckCircle2
};

type GuidedScenario = (typeof guidedScenarioCatalog)[number];

async function prepareGuidedScenario(routerMode: RouterMode, scenario: GuidedScenario) {
  await resetDebugState(routerMode);
  const data = await setDebugModeState(routerMode, scenario.mode);
  return { data, scenario };
}

function finishGuidedScenario(routerMode: RouterMode, data: DebugState, scenario: GuidedScenario) {
  setLocalSkewMode(routerMode, data.mode);
  applyReleasePayload(routerMode, data.version);
  if ("seedKybDraft" in scenario && scenario.seedKybDraft) {
    seedIncompatibleKybDraft(routerMode);
  }
  writeGuidedScenarioState({
    id: scenario.id,
    title: scenario.title,
    outcome: scenario.outcome,
    href: scenario.href,
    steps: [...scenario.steps],
    targetStepIndex: scenario.targetStepIndex
  });
  window.location.assign(debugRouteHref(scenario.href, routerMode));
}

export function VersionSkewDebugPage({ routerMode }: { routerMode: RouterMode }) {
  const queryClient = useQueryClient();
  const [, setTick] = useState(0);
  const query = useQuery({ queryKey: ["debug-version-skew", routerMode], queryFn: () => readDebugState(routerMode) });
  const mutation = useMutation({
    mutationFn: (mode: SkewMode) => setDebugModeState(routerMode, mode),
    onSuccess(data) {
      setLocalSkewMode(routerMode, data.mode);
      applyReleasePayload(routerMode, data.version, modeEvent[data.mode]);
      void checkForVersionUpdate(routerMode, "debug-mode-change");
      queryClient.invalidateQueries({ queryKey: ["debug-version-skew", routerMode] });
    }
  });
  const resetMutation = useMutation({
    mutationFn: () => resetDebugState(routerMode),
    onSuccess() {
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
    ? [...guidedScenarioCatalog].sort((a, b) => Number(b.id === suggestedScenarioId) - Number(a.id === suggestedScenarioId))
    : guidedScenarioCatalog;
  const runGuidedScenario = (scenario: GuidedScenario) => scenarioMutation.mutate(scenario);

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Version skew simulation</p>
          <h1>Lab controls</h1>
        </div>
        <div className="reset-panel">
          <button className="button" type="button" disabled={resetMutation.isPending} onClick={() => resetMutation.mutate()}>
            <RefreshCcw aria-hidden="true" />
            {resetMutation.isPending ? "Resetting..." : "Reset simulation state"}
          </button>
          <small>Clears drafts, release overrides, reload flags, telemetry, and proof setup.</small>
        </div>
      </section>

      <BuildVersionSnapshot routerMode={routerMode} />

      {resetConfirmed ? (
        <div className="notice notice-success" data-testid="reset-confirmation">
          <CheckCircle2 aria-hidden="true" />
          <span>Simulation state reset. Drafts, release overrides, reload flags, and proof setup were cleared. Debug mode and router choice stayed on.</span>
        </div>
      ) : null}

      <section className="scenario-runner" data-testid="guided-scenarios">
        <header className="section-header">
          <div>
            <p className="eyebrow">Proof setup</p>
            <h2>Pick one proof</h2>
            <p>Each card starts from a clean reset, sets the lab mode, and opens a focused example.</p>
          </div>
        </header>
        <div className="scenario-grid">
          {visibleScenarios.map((scenario) => {
            const Icon = scenarioIcons[scenario.id];
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
                data-testid={`mode-${mode}`}
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
              <span>Update policy</span>
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
