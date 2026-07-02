import { Braces, FileWarning, GitBranch, KeyRound, RefreshCcw, ShieldCheck, type LucideIcon } from "lucide-react";
import { useEffect } from "react";
import { BuildVersionStamp } from "../components/UpdateSurfaces";
import { debugRouteHref } from "../shared/routerLinks";
import { guidedScenarioSetupLabel, simplePatternCatalog, type SimplePatternSlug } from "../examples/simpleVersionSkewPatterns";
import type { RouterMode } from "../shared/types";

const simpleAnchor = "simpleVersionSkewPatterns.ts";
const testAnchor = "simple-patterns.spec.ts + docs vocabulary + update-policy.spec.ts";
const proofCommand = "pnpm test:learning:windows";

const exampleIcons: Record<SimplePatternSlug, LucideIcon> = {
  "release-identity": GitBranch,
  "chunk-recovery": FileWarning,
  "safe-refresh": RefreshCcw,
  "required-update-gate": ShieldCheck,
  "idempotent-mutation": KeyRound,
  "asset-strategy": Braces
};

export function SimpleExamplesPage({ routerMode }: { routerMode: RouterMode }) {
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (id) {
      window.requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "center" }));
    }
  }, []);

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Minimal patterns</p>
          <h1>Simple examples</h1>
        </div>
        <div className="heading-badges">
          <span className="badge badge-muted">Small rules, robust paths</span>
          <BuildVersionStamp routerMode={routerMode} compact />
        </div>
      </section>

      <section className="example-proof-strip" data-testid="simple-proof-anchors" aria-label="Simple examples proof anchors">
        <div className="example-anchor">
          <span>Simple source</span>
          <code>{simpleAnchor}</code>
        </div>
        <div className="example-anchor">
          <span>Verified by</span>
          <code>{testAnchor}</code>
        </div>
        <div className="example-anchor">
          <span>Proof command</span>
          <code>{proofCommand}</code>
        </div>
      </section>

      <section className="example-pattern-grid" data-testid="simple-examples">
        {simplePatternCatalog.map((example, index) => {
          const Icon = exampleIcons[example.slug];
          return (
            <article className="example-pattern-card" data-testid={`simple-example-${example.slug}`} id={`simple-${example.slug}`} key={example.title}>
              <div className="example-card-top">
                <Icon aria-hidden="true" />
                <span className="status-chip">Step {index + 1}</span>
              </div>
              <span>Solve path: {example.stepTitle}</span>
              <strong>{example.title}</strong>
              <p>{example.rule}</p>
              <span className="example-code-label">Minimal rule</span>
              <pre className="example-code">
                <code>{example.code}</code>
              </pre>
              <div className="example-anchor">
                <span>Robust source</span>
                <code>{example.anchor}</code>
              </div>
              <span>
                <strong>Robust path:</strong> {example.hook}
              </span>
              <a className="button button-light" href={debugRouteHref("/debug/version-skew", routerMode, example.scenarioId)}>
                {example.scenarioId ? guidedScenarioSetupLabel(example.scenarioId) : "Open lab controls"}
              </a>
            </article>
          );
        })}
      </section>
    </div>
  );
}
