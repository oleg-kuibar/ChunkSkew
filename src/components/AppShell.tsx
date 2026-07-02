import {
  Activity,
  BadgeDollarSign,
  BookOpenCheck,
  Building2,
  ClipboardCheck,
  CreditCard,
  FileClock,
  Gauge,
  KeyRound,
  Landmark,
  ListChecks,
  LayoutDashboard,
  ShieldCheck,
  Users,
  X
} from "lucide-react";
import { Fragment, type ReactNode, useEffect, useState } from "react";
import { clearGuidedScenarioState, readGuidedScenarioState, type GuidedScenarioState } from "../shared/guidedScenarioState";
import { cx } from "../shared/format";
import { isDebugMode, setDebugMode } from "../shared/releaseIdentity";
import { debugRouteHref } from "../shared/routerLinks";
import { getSessionSnapshot } from "../shared/sessionSimulation";
import { checkForVersionUpdate } from "../shared/versionCheckClient";
import type { RouterMode } from "../shared/types";
import { BuildVersionStamp, UpdateBanner, UpdateToast, VersionDebugPanel } from "./UpdateSurfaces";

export type LinkRenderer = (props: { to: string; children: ReactNode; className?: string }) => ReactNode;

const navItems = [
  { to: "/", label: "Start here", icon: LayoutDashboard },
  { to: "/examples", label: "Simple examples", icon: BookOpenCheck },
  { to: "/payments/create/recipient", label: "Payment example", icon: BadgeDollarSign },
  { to: "/invoices", label: "Invoice example", icon: ClipboardCheck },
  { to: "/cards", label: "Card example", icon: CreditCard },
  { to: "/kyb/business", label: "KYB example", icon: Building2 },
  { to: "/transactions", label: "Report example", icon: Activity },
  { to: "/settings", label: "Session and roles", icon: Users },
  { to: "/audit", label: "Audit log", icon: FileClock },
  { to: "/debug/version-skew", label: "Lab controls", icon: Gauge }
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
  const session = getSessionSnapshot();
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
          <Landmark aria-hidden="true" />
          <div>
            <strong>ChunkSkew Lab</strong>
            <span>Build version skew examples</span>
          </div>
        </div>
        <nav aria-label="Primary">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Fragment key={item.to}>
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
              </Fragment>
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
              Fake data only
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
              <span>{session.user.name}</span>
              <small>{session.user.role}</small>
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

  return (
    <section className="guided-scenario-banner" data-testid="guided-scenario-banner" aria-label="Active proof setup">
      <ListChecks aria-hidden="true" />
      <div>
        <strong>{scenario.title}</strong>
        <small data-testid="guided-scenario-status">{status}</small>
        <span>{scenario.outcome}</span>
        <ol>
          {scenario.steps.map((step, index) => (
            <li className={cx(index < activeStepIndex && "complete", index === activeStepIndex && "active")} key={step}>
              {step}
            </li>
          ))}
        </ol>
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
        <button className="icon-button" type="button" aria-label="Clear proof setup" title="Clear proof setup" onClick={onClear}>
          <X aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
