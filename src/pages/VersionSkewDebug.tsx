import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Bug, CheckCircle2, RefreshCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { AssetRetentionWarning } from "../components/UpdateSurfaces";
import { apiFetch } from "../shared/apiClient";
import { setLocalSkewMode } from "../shared/assetRetentionSimulator";
import { readPreloadStatuses } from "../shared/preloadWorkflowChunks";
import { cx } from "../shared/format";
import { seedIncompatibleKybDraft } from "../shared/workflowDraftStore";
import { clearTelemetryEvents } from "../shared/telemetry";
import { checkForVersionUpdate, getVersionState } from "../shared/versionCheckClient";
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

interface DebugState {
  mode: SkewMode;
  activeReleaseId: string;
  latestReleaseId: string;
  updateSeverity: string;
  apiContractVersion: string;
  version: ReleaseMetadata;
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
      window.location.assign(`/debug/version-skew?debug=1&router=${routerMode === "tanstack-router" ? "tanstack" : "react"}`);
    }
  });
  useEffect(() => {
    const interval = window.setInterval(() => setTick((value) => value + 1), 2000);
    return () => window.clearInterval(interval);
  }, []);
  const versionState = getVersionState(routerMode);
  const statuses = readPreloadStatuses();

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Internal simulation</p>
          <h1>Version skew controls</h1>
        </div>
        <button className="button button-light" type="button" onClick={() => void checkForVersionUpdate(routerMode, "manual-debug")}>
          <RefreshCcw aria-hidden="true" />
          Check version
        </button>
      </section>

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
          <span>Current release</span>
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
        <button
          className="button button-light"
          type="button"
          disabled={resetMutation.isPending}
          onClick={() => resetMutation.mutate()}
        >
          <RefreshCcw aria-hidden="true" />
          {resetMutation.isPending ? "Resetting..." : "Reset simulation state"}
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
