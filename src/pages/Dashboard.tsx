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
  WalletCards,
  type LucideIcon
} from "lucide-react";
import {
  guidedScenarioSetupLabel,
  primaryGuidedScenario,
  simplePatternCatalog,
  startPageScenarioCatalog,
  type GuidedScenarioId
} from "../examples/simpleVersionSkewPatterns";
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

const scenarioIcons: Record<GuidedScenarioId, LucideIcon> = {
  "payment-safe-refresh": WalletCards,
  "missing-chunk": Bug,
  "kyb-draft": FileClock,
  "api-contract": ShieldCheck,
  "asset-strategy": BadgeCheck
};

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
            <a className="button button-light" href={debugRouteHref("/debug/version-skew", routerMode, primaryGuidedScenario.id)}>
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
        {startPageScenarioCatalog.map((scenario) => {
          const Icon = scenarioIcons[scenario.id];
          return (
            <a className="learning-card learning-card-link" href={debugRouteHref("/debug/version-skew", routerMode, scenario.id)} key={scenario.title}>
              <Icon aria-hidden="true" />
              <strong>{scenario.title}</strong>
              <p>{scenario.outcome}</p>
              <span>
                {guidedScenarioSetupLabel(scenario.id)}
                <ArrowRight aria-hidden="true" />
              </span>
            </a>
          );
        })}
        <a className="learning-card learning-card-link" href={debugRouteHref("/debug/version-skew", routerMode)}>
          <ShieldCheck aria-hidden="true" />
          <strong>Lab controls</strong>
          <p>Reset state, switch deployment modes, inspect release identity, and review preload status.</p>
          <span>
            Open lab controls
            <ArrowRight aria-hidden="true" />
          </span>
        </a>
      </section>

      <section className="learning-grid pattern-map" aria-labelledby="pattern-map-heading">
        <header className="section-header wide-panel">
          <div>
            <h2 id="pattern-map-heading">Solve in this order</h2>
            <p>Use the simple examples as the checklist, then open the robust examples to see each rule under workflow pressure.</p>
          </div>
        </header>
        {simplePatternCatalog.map((pattern, index) => (
          <article className="learning-card" key={pattern.stepTitle}>
            <span className="status-chip">Pattern {index + 1}</span>
            <strong>{pattern.stepTitle}</strong>
            <p>{pattern.summary}</p>
            <a className="learning-step-link" href={debugRouteHref(`/examples#simple-${pattern.slug}`, routerMode)} aria-label={`Open ${pattern.stepTitle} simple example`}>
              Open Step {index + 1}
              <ArrowRight aria-hidden="true" />
            </a>
          </article>
        ))}
      </section>
    </div>
  );
}
