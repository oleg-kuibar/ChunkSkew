import {
  ArrowRight,
  BookOpenCheck,
  ShieldCheck
} from "lucide-react";
import { debugRouteHref } from "../shared/routerLinks";
import type { RouterMode } from "../shared/types";

const articleSteps = [
  {
    title: "1. See old tab",
    body: "Loaded build A. Latest build B. Show one notice.",
    href: "/examples#simple-release-identity",
    action: "Read note"
  },
  {
    title: "2. Save text",
    body: "Typed text. Save, refresh, restore.",
    href: "/debug/version-skew",
    scenarioId: "save-refresh",
    action: "Try it"
  },
  {
    title: "3. Block submit",
    body: "If submit is unsafe, stop it and ask for refresh.",
    href: "/debug/version-skew",
    scenarioId: "block-submit",
    action: "Try it"
  }
];

export function StartPage({ routerMode }: { routerMode: RouterMode }) {
  return (
    <div className="page-stack">
      <section className="learning-hero">
        <div className="learning-hero-copy">
          <p className="eyebrow">Build version skew</p>
          <h1>Three simple examples</h1>
          <p>
            Old tab. Saved text. Blocked submit.
          </p>
          <div className="learning-actions">
            <a className="button" href="#article-path-heading">
              <BookOpenCheck aria-hidden="true" />
              Read below
            </a>
            <a className="button" href={debugRouteHref("/debug/version-skew", routerMode)}>
              <ShieldCheck aria-hidden="true" />
              Open controls
            </a>
          </div>
        </div>
      </section>

      <section className="article-path" aria-labelledby="article-path-heading">
        <header className="section-header wide-panel">
          <div>
            <h2 id="article-path-heading">Try these three</h2>
            <p>One idea per row.</p>
          </div>
        </header>
        {articleSteps.map((step) => {
          return (
            <article className="article-step" key={step.title}>
              <div>
                <strong>{step.title}</strong>
                <p>{step.body}</p>
              </div>
              <a className="learning-step-link" href={debugRouteHref(step.href, routerMode, "scenarioId" in step ? step.scenarioId : undefined)} aria-label={`${step.action} for ${step.title}`}>
                {step.action}
                <ArrowRight aria-hidden="true" />
              </a>
          </article>
        );
      })}
      </section>
    </div>
  );
}
