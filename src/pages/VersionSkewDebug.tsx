import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle2,
  Play,
  RefreshCcw,
  Trash2,
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
import { seedOldDraftExample } from "../shared/workflowDraftStore";
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
import { workflowTypeLabels, type RouterMode, type SkewMode } from "../shared/types";
import { AuditEventTable } from "../components/AuditEventTable";

type GuidedScenario = (typeof guidedScenarioCatalog)[number];
const coreGuidedScenarioIds: readonly GuidedScenarioId[] = ["save-refresh", "block-submit"];
const preloadRouteLabels: Record<string, string> = {
  "draft-write": "draft-write",
  "draft-check": "draft-check",
  "draft-submit": "draft-submit",
  "draft-done": "draft-done",
  "bad-draft-note": "bad-draft-note",
  "bad-draft-check": "bad-draft-check",
  "bad-draft-done": "bad-draft-done",
  "retained-file": "retained-file",
  "event-drawer": "event-drawer",
  "tanstack-draft-route": "tanstack-draft-route"
};

async function prepareGuidedScenario(routerMode: RouterMode, scenario: GuidedScenario) {
  await resetDebugState(routerMode);
  const data = await setDebugModeState(routerMode, scenario.mode);
  return { data, scenario };
}

function finishGuidedScenario(routerMode: RouterMode, data: DebugState, scenario: GuidedScenario) {
  setLocalSkewMode(routerMode, data.mode);
  applyReleasePayload(routerMode, data.version);
  if ("seedBadDraft" in scenario && scenario.seedBadDraft) {
    seedOldDraftExample(routerMode);
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
  const visibleScenarios = guidedScenarioCatalog
    .filter((scenario) => coreGuidedScenarioIds.includes(scenario.id) || scenario.id === suggestedScenarioId)
    .sort((a, b) => Number(b.id === suggestedScenarioId) - Number(a.id === suggestedScenarioId));
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
          <small>Clears saved drafts, version overrides, and the event log.</small>
        </div>
      </section>

      {resetConfirmed ? (
        <div className="notice notice-success" data-testid="reset-confirmation">
          <CheckCircle2 aria-hidden="true" />
          <span>Simulation state reset. Saved drafts, version overrides, and the event log were cleared. Debug mode and router choice stayed on.</span>
        </div>
      ) : null}

      <section className="scenario-runner" data-testid="guided-scenarios">
        <header className="section-header">
          <div>
            <p className="eyebrow">Example setup</p>
            <h2>Pick one</h2>
            <p>Reset state, then open the example.</p>
          </div>
        </header>
        <div className="scenario-grid">
          {visibleScenarios.map((scenario) => {
            const suggested = scenario.id === suggestedScenarioId;
            return (
              <article className={cx("scenario-card", suggested && "active")} data-testid={`guided-scenario-${scenario.id}`} key={scenario.id}>
                <div className="scenario-card-main">
                  <strong>{scenario.title}</strong>
                  <p>{scenario.outcome}</p>
                </div>
                <span className="status-chip">{suggested ? "Next" : "Ready"}</span>
                <button
                  className="button button-light"
                  type="button"
                  aria-label={scenario.action}
                  disabled={mutation.isPending || scenarioMutation.isPending}
                  onClick={() => runGuidedScenario(scenario)}
                >
                  <Play aria-hidden="true" />
                  {scenarioMutation.isPending ? "Preparing..." : "Start"}
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
            <h2>Diagnostics</h2>
            <p>Inspect raw modes, release facts, chunk preloads, and the event trace.</p>
          </div>
        </summary>

        <div className="advanced-diagnostics-body">
          <BuildVersionSnapshot routerMode={routerMode} />

          <div className="table-wrap" data-testid="deployment-modes">
            <table>
              <thead>
                <tr>
                  <th>Mode</th>
                  <th>Meaning</th>
                  <th>Current</th>
                  <th>Use</th>
                </tr>
              </thead>
              <tbody>
                {modes.map((mode) => (
                  <tr className={cx(query.data?.mode === mode && "active")} key={mode}>
                    <td>
                      <strong>{mode}</strong>
                    </td>
                    <td>{modeCopy(mode)}</td>
                    <td>{query.data?.mode === mode ? "yes" : ""}</td>
                    <td>
                      <button
                        className="button button-light"
                        data-testid={`mode-${mode}`}
                        type="button"
                        onClick={() => mutation.mutate(mode)}
                      >
                        Use
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <AssetRetentionWarning active={versionState.latest.skewMode === "asset-retention" || query.data?.mode === "asset-retention"} />

          <div className="table-wrap">
            <table>
              <tbody>
                <tr>
                  <th>Loaded bundle</th>
                  <td>{bundle.releaseId}</td>
                </tr>
                <tr>
                  <th>Session release</th>
                  <td>{versionState.current.releaseId}</td>
                </tr>
                <tr>
                  <th>Latest release</th>
                  <td>{versionState.latest.releaseId}</td>
                </tr>
                <tr>
                  <th>Update policy</th>
                  <td>{versionState.updateSeverity}</td>
                </tr>
                <tr>
                  <th>API contract</th>
                  <td>{versionState.apiContractCompatible ? "compatible" : "blocked"}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <section className="toolbar">
            <button className="button button-light" type="button" onClick={() => void checkForVersionUpdate(routerMode, "manual-debug")}>
              <RefreshCcw aria-hidden="true" />
              Check version
            </button>
            <button className="button button-secondary" type="button" onClick={() => seedOldDraftExample(routerMode)}>
              <AlertTriangle aria-hidden="true" />
              Seed old draft
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
              Clear log
            </button>
          </section>

          <section className="table-section">
            <header className="section-header">
              <div>
                <h2>Chunk preload table</h2>
                <p>Lazy routes needed to finish an example.</p>
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
                    <th>Chunk</th>
                    <th>Example</th>
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
                      <td title={status.route}>{preloadRouteLabels[status.route] ?? status.route}</td>
                      <td>{workflowTypeLabels[status.workflowType]}</td>
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
