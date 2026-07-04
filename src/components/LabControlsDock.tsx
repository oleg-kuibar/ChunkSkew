import {
  CheckCircle2,
  ClipboardList,
  ExternalLink,
  FileClock,
  PanelLeftOpen,
  PanelRightOpen,
  RefreshCcw,
  RotateCcw,
  SlidersHorizontal,
  Trash2,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import { getLocalSkewMode } from "../shared/assetRetentionSimulator";
import { cx } from "../shared/format";
import {
  applyDebugState,
  modeLabel,
  resetDebugState,
  setDebugModeState
} from "../shared/labStateControls";
import { readPreloadStatuses } from "../shared/preloadWorkflowChunks";
import { getBundledReleaseIdentity } from "../shared/releaseIdentity";
import { debugRouteHref } from "../shared/routerLinks";
import { clearTelemetryEvents } from "../shared/telemetry";
import type { RouterMode, SkewMode } from "../shared/types";
import { checkForVersionUpdate, getVersionState, subscribeVersionState } from "../shared/versionCheckClient";
import { seedOldDraftExample } from "../shared/workflowDraftStore";
import { BuildVersionStamp } from "./UpdateSurfaces";

type DockSide = "left" | "right";
type RunAction = (actionKey: string, nextMessage: string, action: () => Promise<unknown> | unknown) => Promise<void>;
type VersionStateSnapshot = ReturnType<typeof getVersionState>;
type ReleaseSnapshot = ReturnType<typeof getBundledReleaseIdentity>;

const preferencePrefix = "chunk-skew-lab-controls";

function readPreference(key: string, fallback: string) {
  if (typeof window === "undefined") {
    return fallback;
  }
  return window.localStorage.getItem(`${preferencePrefix}:${key}`) ?? fallback;
}

function writePreference(key: string, value: string) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(`${preferencePrefix}:${key}`, value);
}

function activeSkewMode(routerMode: RouterMode): SkewMode {
  return getLocalSkewMode(routerMode) ?? getVersionState(routerMode).latest.skewMode ?? "asset-retention";
}

function shortRelease(releaseId: string) {
  return releaseId.length > 18 ? `${releaseId.slice(0, 15)}...` : releaseId;
}

export function LabControlsDock({ routerMode }: { routerMode: RouterMode }) {
  const [open, setOpenState] = useState(() => readPreference("open", "0") === "1");
  const [side, setSideState] = useState<DockSide>(() => (readPreference("side", "right") === "left" ? "left" : "right"));
  const [details, setDetailsState] = useState(() => readPreference("details", "0") === "1");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [message, setMessage] = useState("Ready");
  const [, setTick] = useState(0);

  useEffect(() => {
    const refresh = () => setTick((value) => value + 1);
    const unsubscribe = subscribeVersionState(refresh);
    window.addEventListener("chunk-skew-storage", refresh);
    return () => {
      unsubscribe();
      window.removeEventListener("chunk-skew-storage", refresh);
    };
  }, []);

  const setOpen = (next: boolean) => {
    setOpenState(next);
    writePreference("open", next ? "1" : "0");
  };
  const setSide = (next: DockSide) => {
    setSideState(next);
    writePreference("side", next);
  };
  const setDetails = (next: boolean) => {
    setDetailsState(next);
    writePreference("details", next ? "1" : "0");
  };

  const versionState = getVersionState(routerMode);
  const bundle = getBundledReleaseIdentity(routerMode);
  const currentMode = activeSkewMode(routerMode);
  const statuses = readPreloadStatuses();
  const fullLabHref = debugRouteHref("/debug/version-skew", routerMode);

  async function runAction(actionKey: string, nextMessage: string, action: () => Promise<unknown> | unknown) {
    setPendingAction(actionKey);
    setMessage("Working...");
    try {
      await action();
      setMessage(nextMessage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setPendingAction(null);
      setTick((value) => value + 1);
    }
  }

  const changeMode = (mode: SkewMode) =>
    runAction(`mode:${mode}`, `${modeLabel(mode)} active`, async () => {
      const data = await setDebugModeState(routerMode, mode);
      applyDebugState(routerMode, data);
    });

  if (!open) {
    return (
      <DockToggle currentMode={currentMode} side={side} onOpen={() => setOpen(true)} />
    );
  }

  return (
    <DockWindow
      bundle={bundle}
      currentMode={currentMode}
      details={details}
      fullLabHref={fullLabHref}
      message={message}
      pendingAction={pendingAction}
      routerMode={routerMode}
      runAction={runAction}
      setDetails={setDetails}
      setOpen={setOpen}
      setSide={setSide}
      side={side}
      statusesCount={statuses.length}
      versionState={versionState}
      changeMode={changeMode}
    />
  );
}

function DockToggle({ currentMode, side, onOpen }: { currentMode: SkewMode; side: DockSide; onOpen: () => void }) {
  return (
    <button
      className={cx("lab-controls-toggle", `lab-controls-${side}`)}
      type="button"
      aria-label={`Open lab controls, current mode ${modeLabel(currentMode)}`}
      aria-controls="lab-controls-dock"
      aria-expanded="false"
      data-testid="lab-controls-toggle"
      onClick={onOpen}
    >
      <SlidersHorizontal aria-hidden="true" />
      <span>Lab controls</span>
      <small>{modeLabel(currentMode)}</small>
    </button>
  );
}

function DockWindow({
  bundle,
  currentMode,
  details,
  fullLabHref,
  message,
  pendingAction,
  routerMode,
  runAction,
  setDetails,
  setOpen,
  setSide,
  side,
  statusesCount,
  versionState,
  changeMode
}: {
  bundle: ReleaseSnapshot;
  currentMode: SkewMode;
  details: boolean;
  fullLabHref: string;
  message: string;
  pendingAction: string | null;
  routerMode: RouterMode;
  runAction: RunAction;
  setDetails: (next: boolean) => void;
  setOpen: (next: boolean) => void;
  setSide: (next: DockSide) => void;
  side: DockSide;
  statusesCount: number;
  versionState: VersionStateSnapshot;
  changeMode: (mode: SkewMode) => void;
}) {
  return (
    <aside
      className={cx("lab-controls-window", `lab-controls-${side}`)}
      id="lab-controls-dock"
      aria-label="Persistent lab controls"
      data-testid="lab-controls-dock"
    >
      <header className="lab-controls-header">
        <div>
          <p className="eyebrow">Always available</p>
          <h2>Lab controls</h2>
        </div>
        <button className="icon-button" type="button" aria-label="Collapse lab controls" onClick={() => setOpen(false)}>
          <X aria-hidden="true" />
        </button>
      </header>
      <BuildVersionStamp routerMode={routerMode} label="Build" compact />
      <DockPrimaryActions changeMode={changeMode} currentMode={currentMode} pendingAction={pendingAction} routerMode={routerMode} runAction={runAction} />
      <details className="lab-controls-more">
        <summary>More controls</summary>
        <DockUtilityActions pendingAction={pendingAction} routerMode={routerMode} runAction={runAction} />
        <DockConfig details={details} setDetails={setDetails} setSide={setSide} side={side} />
        {details ? <DockDetails bundle={bundle} statusesCount={statusesCount} versionState={versionState} /> : null}
      </details>
      <DockFooter fullLabHref={fullLabHref} message={message} />
    </aside>
  );
}

function DockPrimaryActions({
  changeMode,
  currentMode,
  pendingAction,
  routerMode,
  runAction
}: {
  changeMode: (mode: SkewMode) => void;
  currentMode: SkewMode;
  pendingAction: string | null;
  routerMode: RouterMode;
  runAction: RunAction;
}) {
  const disabled = pendingAction !== null;
  return (
    <section className="lab-controls-actions" aria-label="State controls">
      <button
        className="button"
        type="button"
        data-testid="lab-dock-reset"
        disabled={disabled}
        onClick={() =>
          runAction("reset", "Simulation state reset", async () => {
            const data = await resetDebugState(routerMode);
            applyDebugState(routerMode, data);
          })
        }
      >
        <RotateCcw aria-hidden="true" />
        Reset
      </button>
      <button
        className="button button-light"
        type="button"
        data-testid="lab-dock-mode-broken"
        disabled={disabled}
        aria-pressed={currentMode === "broken"}
        onClick={() => changeMode("broken")}
      >
        <FileClock aria-hidden="true" />
        Make tab old
      </button>
      <button
        className="button button-light"
        type="button"
        data-testid="lab-dock-mode-api-contract-incompatible"
        disabled={disabled}
        aria-pressed={currentMode === "api-contract-incompatible"}
        onClick={() => changeMode("api-contract-incompatible")}
      >
        <ClipboardList aria-hidden="true" />
        Block submit
      </button>
    </section>
  );
}

function DockUtilityActions({
  pendingAction,
  routerMode,
  runAction
}: {
  pendingAction: string | null;
  routerMode: RouterMode;
  runAction: RunAction;
}) {
  const disabled = pendingAction !== null;
  return (
    <section className="lab-controls-actions" aria-label="Extra state controls">
      <button
        className="button button-light"
        type="button"
        disabled={disabled}
        onClick={() => runAction("check", "Version check complete", () => checkForVersionUpdate(routerMode, "lab-dock"))}
      >
        <RefreshCcw aria-hidden="true" />
        Check version
      </button>
      <button
        className="button button-secondary"
        type="button"
        disabled={disabled}
        onClick={() => runAction("old-draft", "Old draft ready", () => seedOldDraftExample(routerMode))}
      >
        <FileClock aria-hidden="true" />
        Old draft
      </button>
      <button
        className="button button-secondary"
        type="button"
        disabled={disabled}
        onClick={() => runAction("log", "Log cleared", clearTelemetryEvents)}
      >
        <Trash2 aria-hidden="true" />
        Clear log
      </button>
    </section>
  );
}

function DockConfig({
  details,
  setDetails,
  setSide,
  side
}: {
  details: boolean;
  setDetails: (next: boolean) => void;
  setSide: (next: DockSide) => void;
  side: DockSide;
}) {
  return (
    <section className="lab-controls-config" aria-label="Dock options">
      <div className="segmented" aria-label="Dock side">
        <button className={side === "left" ? "active" : ""} type="button" aria-pressed={side === "left"} onClick={() => setSide("left")}>
          <PanelLeftOpen aria-hidden="true" />
          Left
        </button>
        <button className={side === "right" ? "active" : ""} type="button" aria-pressed={side === "right"} onClick={() => setSide("right")}>
          <PanelRightOpen aria-hidden="true" />
          Right
        </button>
      </div>
      <button className="button button-light" type="button" aria-pressed={details} onClick={() => setDetails(!details)}>
        <ClipboardList aria-hidden="true" />
        {details ? "Compact" : "Details"}
      </button>
    </section>
  );
}

function DockDetails({
  bundle,
  statusesCount,
  versionState
}: {
  bundle: ReleaseSnapshot;
  statusesCount: number;
  versionState: VersionStateSnapshot;
}) {
  const items = [
    ["Bundle", shortRelease(bundle.releaseId)],
    ["Session", shortRelease(versionState.current.releaseId)],
    ["Latest", shortRelease(versionState.latest.releaseId)],
    ["Policy", versionState.updateSeverity],
    ["Chunks", String(statusesCount)]
  ];
  return (
    <section className="lab-controls-details" aria-label="Release details">
      <dl>
        {items.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function DockFooter({ fullLabHref, message }: { fullLabHref: string; message: string }) {
  return (
    <footer className="lab-controls-footer">
      <span role="status" aria-live="polite">
        <CheckCircle2 aria-hidden="true" />
        {message}
      </span>
      <a className="button button-light" href={fullLabHref}>
        <ExternalLink aria-hidden="true" />
        Full lab
      </a>
    </footer>
  );
}
