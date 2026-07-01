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
  LayoutDashboard,
  ShieldCheck,
  Users
} from "lucide-react";
import { Fragment, type ReactNode, useEffect, useState } from "react";
import { isDebugMode, setDebugMode } from "../shared/releaseIdentity";
import { getSessionSnapshot } from "../shared/sessionSimulation";
import { checkForVersionUpdate } from "../shared/versionCheckClient";
import type { RouterMode } from "../shared/types";
import { BuildVersionStamp, RouterModeBadge, UpdateBanner, UpdateToast, VersionDebugPanel } from "./UpdateSurfaces";

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
  link,
  children
}: {
  routerMode: RouterMode;
  link: LinkRenderer;
  children: ReactNode;
}) {
  const [debug, setDebug] = useState(isDebugMode());
  const session = getSessionSnapshot();
  useEffect(() => {
    void checkForVersionUpdate(routerMode, "route-transition");
  }, [routerMode]);

  return (
    <div className="app-shell">
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
            <RouterModeBadge routerMode={routerMode} />
            <BuildVersionStamp routerMode={routerMode} />
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
        <main className="content">{children}</main>
      </div>
      <VersionDebugPanel routerMode={routerMode} />
    </div>
  );
}
