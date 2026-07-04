import {
  BadgeCheck,
  BookOpenCheck,
  Gauge,
  KeyRound,
  ListChecks,
  ShieldCheck,
  X
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { clearGuidedScenarioState, readGuidedScenarioState, type GuidedScenarioState } from "../shared/guidedScenarioState";
import { isDebugMode, setDebugMode } from "../shared/releaseIdentity";
import { debugRouteHref } from "../shared/routerLinks";
import { checkForVersionUpdate } from "../shared/versionCheckClient";
import type { RouterMode } from "../shared/types";
import { LabControlsDock } from "./LabControlsDock";
import { BuildVersionStamp, UpdateBanner, UpdateToast, VersionDebugPanel } from "./UpdateSurfaces";

export type LinkRenderer = (props: { to: string; children: ReactNode; className?: string }) => ReactNode;

const primaryNavItems = [
  { to: "/", label: "Start", icon: BookOpenCheck },
  { to: "/examples", label: "Examples", icon: BadgeCheck },
  { to: "/debug/version-skew", label: "Controls", icon: Gauge }
];

export function AppShell({
  routerMode,
  routeKey,
  link,
  children
}: {
  routerMode: RouterMode;
  routeKey: string;
  link: LinkRenderer;
  children: ReactNode;
}) {
  const [debug, setDebug] = useState(isDebugMode());
  const [guidedScenario, setGuidedScenario] = useState(() => readGuidedScenarioState());
  const routerHref = (target: "react" | "tanstack") => {
    if (typeof window === "undefined") {
      return `/?router=${target}`;
    }
    const params = new URLSearchParams(window.location.search);
    params.set("router", target);
    if (debug) {
      params.set("debug", "1");
    } else {
      params.delete("debug");
    }
    return `${window.location.pathname}?${params.toString()}`;
  };
  useEffect(() => {
    void checkForVersionUpdate(routerMode, "route-transition");
  }, [routerMode, routeKey]);
  useEffect(() => {
    const syncGuidedScenario = (event: Event) => {
      const key = (event as CustomEvent<{ key?: string }>).detail?.key;
      if (!key || key === "guided-scenario") {
        setGuidedScenario(readGuidedScenarioState());
      }
    };
    window.addEventListener("chunk-skew-storage", syncGuidedScenario);
    return () => window.removeEventListener("chunk-skew-storage", syncGuidedScenario);
  }, []);

  return (
    <div className={debug ? "app-shell debug-panel-open" : "app-shell"}>
      <aside className="sidebar">
        <div className="brand">
          <BookOpenCheck aria-hidden="true" />
          <div>
            <strong>ChunkSkew Lab</strong>
            <span>Small version-skew examples</span>
          </div>
        </div>
        <nav aria-label="Primary">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.to}>
                {link({
                  to: item.to,
                  className: "nav-link",
                  children: (
                    <>
                      <Icon aria-hidden="true" />
                      <span>{item.label}</span>
                    </>
                  )
                })}
              </div>
            );
          })}
        </nav>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <nav className="router-switch" aria-label="Router mode" data-testid="router-mode-switch">
              <a href={routerHref("react")} aria-current={routerMode === "react-router" ? "page" : undefined}>
                React
              </a>
              <a href={routerHref("tanstack")} aria-current={routerMode === "tanstack-router" ? "page" : undefined}>
                TanStack
              </a>
            </nav>
            <BuildVersionStamp routerMode={routerMode} compact />
            <span className="badge badge-muted">
              <ShieldCheck aria-hidden="true" />
              Local lab
            </span>
          </div>
          <div className="topbar-right">
            <button
              className="icon-button"
              type="button"
              aria-label="Toggle debug mode"
              title="Toggle debug mode"
              onClick={() => {
                const next = !debug;
                setDebug(next);
                setDebugMode(next);
              }}
            >
              <KeyRound aria-hidden="true" />
            </button>
            <div className="user-chip">
              <span>Local</span>
              <small>This tab</small>
            </div>
          </div>
        </header>
        <UpdateToast routerMode={routerMode} />
        <UpdateBanner routerMode={routerMode} />
        <GuidedScenarioBanner
          routerMode={routerMode}
          scenario={guidedScenario}
          onClear={() => {
            clearGuidedScenarioState();
            setGuidedScenario(null);
          }}
        />
        <main className="content">{children}</main>
      </div>
      <LabControlsDock routerMode={routerMode} />
      <VersionDebugPanel routerMode={routerMode} />
    </div>
  );
}

function GuidedScenarioBanner({
  routerMode,
  scenario,
  onClear
}: {
  routerMode: RouterMode;
  scenario: GuidedScenarioState | null;
  onClear: () => void;
}) {
  if (!scenario) {
    return null;
  }
  const currentPath = typeof window === "undefined" ? "" : window.location.pathname;
  const isTargetRoute = currentPath === scenario.href;
  const lastStepIndex = Math.max(scenario.steps.length - 1, 0);
  const activeStepIndex = Math.min(scenario.targetStepIndex ?? lastStepIndex, lastStepIndex);
  const status = `${isTargetRoute ? "Current" : "Ready"}: step ${activeStepIndex + 1} of ${scenario.steps.length}`;
  const activeStep = scenario.steps[activeStepIndex];

  return (
    <section className="guided-scenario-banner" data-testid="guided-scenario-banner" aria-label="Active example">
      <ListChecks aria-hidden="true" />
      <div>
        <strong>{scenario.title}</strong>
        <small data-testid="guided-scenario-status">{status}</small>
        <span>{activeStep}</span>
      </div>
      <div className="guided-scenario-actions">
        {!isTargetRoute ? (
          <a className="button" href={debugRouteHref(scenario.href, routerMode)}>
            Return to example
          </a>
        ) : null}
        <a className="button button-light" href={debugRouteHref("/debug/version-skew", routerMode)}>
          Lab controls
        </a>
        <button className="icon-button" type="button" aria-label="Clear active example" title="Clear active example" onClick={onClear}>
          <X aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
