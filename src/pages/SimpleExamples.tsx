import { ArrowRight, RefreshCcw } from "lucide-react";
import { BuildVersionStamp } from "../components/UpdateSurfaces";
import { debugRouteHref } from "../shared/routerLinks";
import type { GuidedScenarioId } from "../examples/simpleVersionSkewPatterns";
import type { RouterMode } from "../shared/types";

const mostSimpleExamples = [
  {
    id: "release-identity",
    title: "1. See old tab",
    body: "Loaded build A. Latest build B. Show one refresh notice."
  },
  {
    id: "safe-refresh",
    title: "2. Save text",
    body: "Typed text. Save, refresh, restore.",
    scenarioId: "save-refresh" as GuidedScenarioId
  },
  {
    id: "required-update-gate",
    title: "3. Block submit",
    body: "Old tab. Stop submit. Refresh first.",
    scenarioId: "block-submit" as GuidedScenarioId
  }
];

export function SimpleExamplesPage({ routerMode }: { routerMode: RouterMode }) {
  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Three tiny examples</p>
          <h1>Old tab. Saved text. Blocked submit.</h1>
        </div>
        <div className="heading-badges">
          <a className="button button-secondary" href={debugRouteHref("/debug/version-skew", routerMode)}>
            <RefreshCcw aria-hidden="true" />
            Reset or retest
          </a>
          <BuildVersionStamp routerMode={routerMode} compact />
        </div>
      </section>

      <section className="most-simple-examples" data-testid="most-simple-examples">
        {mostSimpleExamples.map((example) => {
          const scenarioId = "scenarioId" in example ? example.scenarioId : undefined;
          return (
            <article className="most-simple-card" id={`simple-${example.id}`} key={example.title}>
              <div>
                <strong>{example.title}</strong>
                <p>{example.body}</p>
              </div>
              {scenarioId ? (
                <a className="button button-light" href={debugRouteHref("/debug/version-skew", routerMode, scenarioId)}>
                  Try it
                  <ArrowRight aria-hidden="true" />
                </a>
              ) : null}
            </article>
          );
        })}
      </section>
    </div>
  );
}
