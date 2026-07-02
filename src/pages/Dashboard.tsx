import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  Bug,
  FileClock,
  GitBranch,
  RefreshCcw,
  Route,
  ShieldCheck,
  WalletCards
} from "lucide-react";
import { debugRouteHref } from "../shared/routerLinks";
import type { RouterMode } from "../shared/types";

const labSteps = [
  {
    icon: GitBranch,
    title: "1. Release B deploys",
    body: "The browser keeps running the old bundle while the server starts advertising the latest release."
  },
  {
    icon: Route,
    title: "2. A lazy route loads",
    body: "A payment review, invoice detail, KYB review, or report route asks for a chunk from the old build."
  },
  {
    icon: AlertTriangle,
    title: "3. The chunk is missing",
    body: "The app classifies the import/preload failure, saves workflow context, and avoids a generic crash."
  },
  {
    icon: RefreshCcw,
    title: "4. Recovery is safe",
    body: "Drafts and idempotency keys survive refresh so risky mutations are not submitted twice."
  }
];

const scenarioLinks = [
  {
    title: "Payment safe refresh",
    body: "Autosave a payment, force a required update, refresh safely, and submit without duplicates.",
    href: "/debug/version-skew",
    scenarioId: "payment-safe-refresh",
    icon: WalletCards
  },
  {
    title: "Missing lazy chunk",
    body: "Switch to broken mode and open a lazy review route to see controlled recovery.",
    href: "/debug/version-skew",
    scenarioId: "missing-chunk",
    icon: Bug
  },
  {
    title: "KYB draft compatibility",
    body: "Seed an incompatible KYB draft, then verify the app asks for review instead of submitting.",
    href: "/debug/version-skew",
    scenarioId: "kyb-draft",
    icon: FileClock
  },
  {
    title: "Lab controls",
    body: "Reset state, switch deployment modes, inspect release identity, and review preload status.",
    href: "/debug/version-skew",
    icon: ShieldCheck
  }
];

const patternSteps = [
  {
    title: "Detect release skew",
    body: "Compare bundle, session, and latest release before making update decisions."
  },
  {
    title: "Recover lazy chunks",
    body: "Classify React/TanStack lazy failures, reload once when safe, then stop the loop."
  },
  {
    title: "Preserve work",
    body: "Save drafts and idempotency keys before refresh or route recovery."
  },
  {
    title: "Gate risky actions",
    body: "Block new sensitive mutations only for required updates or incompatible APIs."
  },
  {
    title: "Prove no duplicates",
    body: "Retry with the same idempotency key and return the previous result."
  },
  {
    title: "Host for compatibility",
    body: "Retain old chunks or pin deployments so recovery is a backup path."
  }
];

export function DashboardPage({ routerMode }: { routerMode: RouterMode }) {
  return (
    <div className="page-stack">
      <section className="learning-hero">
        <div className="learning-hero-copy">
          <p className="eyebrow">Build version skew lab</p>
          <h1>Understand the failure. Practice the recovery. Keep the examples simple.</h1>
          <p>
            This app shows what happens when an old browser tab meets a new deployment, then demonstrates the small set of patterns
            that keep sensitive workflows safe.
          </p>
          <div className="learning-actions">
            <a className="button" href={debugRouteHref("/examples", routerMode)}>
              <BookOpenCheck aria-hidden="true" />
              Study simple examples
            </a>
            <a className="button" href={debugRouteHref("/debug/version-skew", routerMode)}>
              <ShieldCheck aria-hidden="true" />
              Open lab controls
            </a>
            <a className="button button-light" href={debugRouteHref("/debug/version-skew", routerMode, "payment-safe-refresh")}>
              <WalletCards aria-hidden="true" />
              Try payment recovery
            </a>
          </div>
        </div>
        <div className="learning-summary" aria-label="Core recovery promise">
          <BadgeCheck aria-hidden="true" />
          <strong>Simple rule</strong>
          <span>Detect release skew, preserve workflow state, block risky mutation only when required, then refresh safely.</span>
        </div>
      </section>

      <section className="learning-grid mental-model-grid" aria-labelledby="mental-model-heading">
        <header className="section-header wide-panel">
          <div>
            <h2 id="mental-model-heading">The mental model</h2>
            <p>Four checkpoints explain most of the problem and most of the fix.</p>
          </div>
        </header>
        {labSteps.map((step) => {
          const Icon = step.icon;
          return (
            <article className="learning-card" key={step.title}>
              <Icon aria-hidden="true" />
              <strong>{step.title}</strong>
              <p>{step.body}</p>
            </article>
          );
        })}
      </section>

      <section className="learning-grid" aria-labelledby="examples-heading">
        <header className="section-header wide-panel">
          <div>
            <h2 id="examples-heading">Robust examples</h2>
            <p>Each path is a working scenario backed by tests and fake deterministic data.</p>
          </div>
        </header>
        {scenarioLinks.map((scenario) => {
          const Icon = scenario.icon;
          return (
            <a className="learning-card learning-card-link" href={debugRouteHref(scenario.href, routerMode, scenario.scenarioId)} key={scenario.title}>
              <Icon aria-hidden="true" />
              <strong>{scenario.title}</strong>
              <p>{scenario.body}</p>
              <span>
                {scenario.scenarioId ? "Open guided setup" : "Open lab controls"}
                <ArrowRight aria-hidden="true" />
              </span>
            </a>
          );
        })}
      </section>

      <section className="learning-grid pattern-map" aria-labelledby="pattern-map-heading">
        <header className="section-header wide-panel">
          <div>
            <h2 id="pattern-map-heading">Solve in this order</h2>
            <p>Use the simple examples as the checklist, then open the robust examples to see each rule under workflow pressure.</p>
          </div>
        </header>
        {patternSteps.map((pattern, index) => (
          <article className="learning-card" key={pattern.title}>
            <span className="status-chip">Pattern {index + 1}</span>
            <strong>{pattern.title}</strong>
            <p>{pattern.body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
