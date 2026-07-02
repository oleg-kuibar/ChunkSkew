import { AlertTriangle, Bug, CheckCircle2, Download, GitBranch, RefreshCcw, ShieldAlert, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { classifyChunkError } from "../shared/chunkErrorClassifier";
import { getBundledReleaseIdentity, isDebugMode } from "../shared/releaseIdentity";
import { exportTelemetryJson, trackTelemetry } from "../shared/telemetry";
import { decideUpdatePolicy } from "../shared/updatePolicyEngine";
import { getVersionState, prepareSafeRefresh, subscribeVersionState } from "../shared/versionCheckClient";
import type { RouterMode, WorkflowType } from "../shared/types";
import { cx } from "../shared/format";

function refreshSafely(routerMode: RouterMode) {
  prepareSafeRefresh(routerMode);
  window.location.reload();
}

function shortRelease(releaseId: string) {
  return releaseId.length > 18 ? `${releaseId.slice(0, 15)}...` : releaseId;
}

function activeRouterMode(): RouterMode {
  if (typeof window === "undefined") {
    return "react-router";
  }
  const stored = window.localStorage.getItem("chunk-skew-finance:router-mode");
  return stored === "tanstack-router" ? "tanstack-router" : "react-router";
}

function getReleaseStatus(state: ReturnType<typeof getVersionState>, bundle: ReturnType<typeof getBundledReleaseIdentity>) {
  const sessionMatchesBundle = state.current.releaseId === bundle.releaseId;
  const sessionMatchesLatest = state.current.releaseId === state.latest.releaseId;
  const bundleMatchesLatest = bundle.releaseId === state.latest.releaseId;
  const fullyCurrent = sessionMatchesBundle && sessionMatchesLatest && bundleMatchesLatest;
  const status = fullyCurrent ? "in sync" : sessionMatchesLatest ? "session recovered" : `${state.updateSeverity} pending`;
  return { fullyCurrent, status };
}

export function BuildVersionStamp({
  routerMode,
  label = "Bundle",
  compact = false
}: {
  routerMode: RouterMode;
  label?: string;
  compact?: boolean;
}) {
  const [, setTick] = useState(0);
  useEffect(() => subscribeVersionState(() => setTick((value) => value + 1)), []);
  const state = getVersionState(routerMode);
  const bundle = getBundledReleaseIdentity(routerMode);
  const bundleRelease = shortRelease(bundle.releaseId);
  const sessionRelease = shortRelease(state.current.releaseId);
  const latest = shortRelease(state.latest.releaseId);
  const { fullyCurrent, status } = getReleaseStatus(state, bundle);
  const title = [
    `Bundle: ${bundle.releaseId}`,
    `Session: ${state.current.releaseId}`,
    `Latest: ${state.latest.releaseId}`,
    `Bundle deployment: ${bundle.deploymentId}`,
    `Session deployment: ${state.current.deploymentId}`,
    `Bundle API contract: ${bundle.apiContractVersion}`,
    `Session API contract: ${state.current.apiContractVersion}`,
    `Status: ${status}`
  ].join("\n");

  return (
    <span
      className={cx("badge badge-build", fullyCurrent && "badge-build-current", state.requiredUpdatePending && "badge-build-required")}
      title={title}
      data-testid="build-version-stamp"
    >
      <GitBranch aria-hidden="true" />
      <span>
        {label} {bundleRelease} / Session {sessionRelease} / Latest {latest}
      </span>
      <small className={compact ? "badge-build-status-compact" : undefined}>{status}</small>
    </span>
  );
}

interface UpdateSurfaceProps {
  routerMode: RouterMode;
  workflowType?: WorkflowType;
  dirtyForm?: boolean;
  mutationPending?: boolean;
  mfaPending?: boolean;
}

export function UpdateToast({ routerMode, workflowType = "none", dirtyForm = false, mutationPending = false, mfaPending = false }: UpdateSurfaceProps) {
  const [, setTick] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => subscribeVersionState(() => setTick((value) => value + 1)), []);
  const policy = decideUpdatePolicy({
    routerMode,
    currentRoute: window.location.pathname,
    workflowType,
    routeIsLazyLoaded: false,
    dirtyForm,
    mutationPending,
    navigationPending: false,
    mfaPending,
    idempotencyKeyPresent: false,
    lastInteractionAt: Date.now(),
    sensitiveWorkflow: workflowType !== "none",
    requiredWorkflowChunksPreloaded: true,
    oldAssetRetentionActive: false,
    deploymentAffinityActive: false,
    apiContractCompatible: true
  });

  const showToast = policy.versionState.updateAvailable && policy.decision === "passive-toast" && !dismissed;
  useEffect(() => {
    if (showToast) {
      trackTelemetry("update_toast_shown", routerMode, { severity: policy.versionState.updateSeverity }, workflowType);
    }
  }, [policy.versionState.updateSeverity, routerMode, showToast, workflowType]);

  if (!showToast) {
    return null;
  }

  return (
    <div className="update-toast" role="status">
      <CheckCircle2 aria-hidden="true" />
      <div>
        <strong>Updated app available</strong>
        <span>{policy.copy}</span>
        <BuildVersionStamp routerMode={routerMode} compact />
      </div>
      <button className="icon-button" type="button" aria-label="Dismiss update notice" onClick={() => setDismissed(true)}>
        <X aria-hidden="true" />
      </button>
    </div>
  );
}

export function UpdateBanner({ routerMode, workflowType = "none", dirtyForm = false, mutationPending = false, mfaPending = false }: UpdateSurfaceProps) {
  const [, setTick] = useState(0);
  useEffect(() => subscribeVersionState(() => setTick((value) => value + 1)), []);
  const policy = decideUpdatePolicy({
    routerMode,
    currentRoute: window.location.pathname,
    workflowType,
    routeIsLazyLoaded: true,
    dirtyForm,
    mutationPending,
    navigationPending: false,
    mfaPending,
    idempotencyKeyPresent: false,
    lastInteractionAt: Date.now(),
    sensitiveWorkflow: workflowType !== "none",
    requiredWorkflowChunksPreloaded: true,
    oldAssetRetentionActive: false,
    deploymentAffinityActive: false,
    apiContractCompatible: true
  });

  const visible = policy.versionState.updateAvailable && policy.decision !== "passive-toast";
  useEffect(() => {
    if (visible) {
      trackTelemetry("update_banner_shown", routerMode, { decision: policy.decision }, workflowType);
    }
  }, [policy.decision, routerMode, visible, workflowType]);

  if (!visible) {
    return null;
  }

  return (
    <div className="update-banner" role="status" data-testid="update-banner">
      <AlertTriangle aria-hidden="true" />
      <div>
        <strong>{policy.readonlyMode ? "Read-only until refresh" : "App update ready"}</strong>
        <span>{policy.copy}</span>
        <BuildVersionStamp routerMode={routerMode} compact />
      </div>
      <button
        type="button"
        className="button button-light"
        onClick={() => {
          trackTelemetry("update_refresh_clicked", routerMode, { decision: policy.decision }, workflowType);
          refreshSafely(routerMode);
        }}
      >
        <RefreshCcw aria-hidden="true" />
        Refresh safely
      </button>
    </div>
  );
}

export function RequiredUpdateGate({ routerMode, message }: { routerMode: RouterMode; message?: string }) {
  return (
    <div className="gate gate-required" role="alert" data-testid="required-update-gate">
      <ShieldAlert aria-hidden="true" />
      <div>
        <strong>Refresh before making this change</strong>
        <span>{message ?? "Your draft is saved. Refresh to continue with the latest app safeguards."}</span>
        <BuildVersionStamp routerMode={routerMode} compact />
      </div>
      <button
        className="button"
        type="button"
        onClick={() => {
          trackTelemetry("update_refresh_clicked", routerMode, { source: "required-update-gate" });
          refreshSafely(routerMode);
        }}
      >
        <RefreshCcw aria-hidden="true" />
        Refresh safely
      </button>
    </div>
  );
}

export function ChunkFailureFallback({
  error,
  routerMode,
  workflowType,
  routeId,
  onRetry
}: {
  error: unknown;
  routerMode: RouterMode;
  workflowType: WorkflowType;
  routeId: string;
  onRetry?: () => void;
}) {
  const classification = useMemo(() => classifyChunkError(error), [error]);
  const versionState = getVersionState(routerMode);
  const bundle = getBundledReleaseIdentity(routerMode);
  const debug = isDebugMode();

  return (
    <section className="fallback-panel" role="alert" data-testid="chunk-failure-fallback">
      <div className="fallback-icon">
        <AlertTriangle aria-hidden="true" />
      </div>
      <div className="fallback-body">
        <h2>Refresh needed to continue safely</h2>
        <p>
          Your entered information has been saved when autosave was active. Refresh to continue on the latest app version; sensitive
          actions will not be submitted twice.
        </p>
        <BuildVersionStamp routerMode={routerMode} />
        <div className="fallback-actions">
          <button
            className="button"
            type="button"
            onClick={() => {
              trackTelemetry("update_refresh_clicked", routerMode, { routeId }, workflowType);
              refreshSafely(routerMode);
            }}
          >
            <RefreshCcw aria-hidden="true" />
            Refresh safely
          </button>
          <button className="button button-secondary" type="button" onClick={onRetry ?? (() => window.location.assign("/"))}>
            Try again
          </button>
        </div>
        {debug ? (
          <dl className="debug-details">
            <div>
              <dt>Error</dt>
              <dd>{classification.message}</dd>
            </div>
            <div>
              <dt>Route</dt>
              <dd>{routeId}</dd>
            </div>
            <div>
              <dt>Router</dt>
              <dd>{routerMode}</dd>
            </div>
            <div>
              <dt>Bundle</dt>
              <dd>{bundle.releaseId}</dd>
            </div>
            <div>
              <dt>Session release</dt>
              <dd>{versionState.current.releaseId}</dd>
            </div>
            <div>
              <dt>Session deployment</dt>
              <dd>{versionState.current.deploymentId}</dd>
            </div>
            <div>
              <dt>Asset</dt>
              <dd>{classification.assetUrl ?? "unknown"}</dd>
            </div>
          </dl>
        ) : null}
      </div>
    </section>
  );
}

export function VersionDebugPanel({ routerMode }: { routerMode: RouterMode }) {
  const [, setTick] = useState(0);
  useEffect(() => subscribeVersionState(() => setTick((value) => value + 1)), []);
  const state = getVersionState(routerMode);
  const bundle = getBundledReleaseIdentity(routerMode);
  const { status } = getReleaseStatus(state, bundle);
  if (!isDebugMode()) {
    return null;
  }
  return (
    <aside className="version-debug-panel" data-testid="version-debug-panel">
      <header>
        <Bug aria-hidden="true" />
        <strong>Release debug</strong>
      </header>
      <dl>
        <div>
          <dt>Loaded bundle</dt>
          <dd>{bundle.releaseId}</dd>
        </div>
        <div>
          <dt>Session release</dt>
          <dd>{state.current.releaseId}</dd>
        </div>
        <div>
          <dt>Latest release</dt>
          <dd>{state.latest.releaseId}</dd>
        </div>
        <div>
          <dt>Update policy</dt>
          <dd>{state.updateSeverity}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{status}</dd>
        </div>
        <div>
          <dt>Mode</dt>
          <dd>{state.latest.skewMode ?? "local"}</dd>
        </div>
      </dl>
      <button className="button button-light" type="button" onClick={() => navigator.clipboard.writeText(exportTelemetryJson())}>
        <Download aria-hidden="true" />
        Copy telemetry JSON
      </button>
    </aside>
  );
}

export function WorkflowAutosaveRestoredNotice({ migrated = false }: { migrated?: boolean }) {
  return (
    <div className="notice notice-success" data-testid="draft-restored-notice">
      <CheckCircle2 aria-hidden="true" />
      <span>{migrated ? "Draft restored after app update. Review migrated fields before submitting." : "Draft restored after app update."}</span>
    </div>
  );
}

export function AssetRetentionWarning({ active }: { active: boolean }) {
  if (!active) {
    return null;
  }
  return (
    <div className="notice notice-info" data-testid="asset-retention-warning">
      <CheckCircle2 aria-hidden="true" />
      <span>Old release assets are retained, so this workflow can finish without a missing chunk.</span>
    </div>
  );
}

export function RouterModeBadge({ routerMode }: { routerMode: RouterMode }) {
  return <span className="badge badge-router">{routerMode === "react-router" ? "React Router" : "TanStack Router"}</span>;
}

export function LazyBoundaryDebugBadge({ label, routerMode }: { label: string; routerMode?: RouterMode }) {
  const mode = routerMode ?? activeRouterMode();
  const [, setTick] = useState(0);
  useEffect(() => subscribeVersionState(() => setTick((value) => value + 1)), []);
  const state = getVersionState(mode);
  const bundle = getBundledReleaseIdentity(mode);
  const sessionMatchesBundle = state.current.releaseId === bundle.releaseId;
  const sessionMatchesLatest = state.current.releaseId === state.latest.releaseId;

  return (
    <span
      className={cx("badge badge-debug", !sessionMatchesLatest && "badge-debug-pending")}
      title={[
        `Lazy boundary: ${label}`,
        `Bundle: ${bundle.releaseId}`,
        `Session: ${state.current.releaseId}`,
        `Latest: ${state.latest.releaseId}`
      ].join("\n")}
    >
      Lazy boundary: {label} · bundle {shortRelease(bundle.releaseId)}
      {!sessionMatchesBundle ? ` · session ${shortRelease(state.current.releaseId)}` : ""}
      {!sessionMatchesLatest ? ` -> latest ${shortRelease(state.latest.releaseId)}` : ""}
    </span>
  );
}

export function SensitiveActionBlockedDialog({
  message,
  onClose
}: {
  message: string;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="blocked-title" data-testid="sensitive-action-blocked">
        <h2 id="blocked-title">Action paused</h2>
        <p>{message}</p>
        <button className="button" type="button" onClick={onClose}>
          Close
        </button>
      </section>
    </div>
  );
}

export function ReadonlyModeBanner({ visible }: { visible: boolean }) {
  if (!visible) {
    return null;
  }
  return (
    <div className="update-banner readonly" role="status" data-testid="readonly-mode-banner">
      <ShieldAlert aria-hidden="true" />
      <div>
        <strong>Read-only mode</strong>
        <span>The backend contract changed. Review is available, but risky changes are paused until refresh.</span>
      </div>
    </div>
  );
}

export function DuplicateSubmitPreventedNotice({ visible }: { visible: boolean }) {
  if (!visible) {
    return null;
  }
  return (
    <div className="notice notice-success" data-testid="duplicate-submit-prevented">
      <CheckCircle2 aria-hidden="true" />
      <span>This retry returned the previous result. No duplicate payment or approval was created.</span>
    </div>
  );
}
