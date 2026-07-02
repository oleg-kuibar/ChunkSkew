import { Braces, FileWarning, GitBranch, KeyRound, RefreshCcw, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { getBundledReleaseIdentity } from "../shared/releaseIdentity";
import { debugRouteHref } from "../shared/routerLinks";
import { getVersionState, subscribeVersionState } from "../shared/versionCheckClient";
import { simplePatternSnippets } from "../examples/simpleVersionSkewPatterns";
import type { RouterMode } from "../shared/types";

const simpleAnchor = "simpleVersionSkewPatterns.ts";
const testAnchor = "simple-patterns.spec.ts";
const proofCommand = "pnpm test:learning:windows";

const examples = [
  {
    title: "Release identity",
    icon: GitBranch,
    rule: "Always compare the loaded bundle, the session release, and the latest release as separate facts.",
    hook: "Badges, request headers, and update decisions.",
    code: simplePatternSnippets.releaseIdentity,
    anchor: "src/shared/releaseIdentity.ts",
    href: "/debug/version-skew"
  },
  {
    title: "Chunk recovery",
    icon: FileWarning,
    rule: "Classify lazy import failures, reload once when safe, then stop and show a controlled fallback.",
    hook: "Route imports, modal imports, preload errors, and router boundaries.",
    code: simplePatternSnippets.chunkRecovery,
    anchor: "src/shared/chunkRecoveryController.ts",
    href: "/debug/version-skew",
    scenarioId: "missing-chunk"
  },
  {
    title: "Safe refresh",
    icon: RefreshCcw,
    rule: "Save draft and idempotency context before refreshing an old tab onto the latest release.",
    hook: "Required gates, sticky banners, and chunk fallbacks.",
    code: simplePatternSnippets.safeRefresh,
    anchor: "src/shared/versionCheckClient.ts",
    href: "/debug/version-skew",
    scenarioId: "payment-safe-refresh"
  },
  {
    title: "Idempotent mutation",
    icon: KeyRound,
    rule: "Retry the same sensitive action with the same key and return the previous result.",
    hook: "Payment submit, approvals, card controls, KYB, vendors, roles, and API keys.",
    code: simplePatternSnippets.idempotentMutation,
    anchor: "src/shared/idempotencyKeyStore.ts",
    href: "/debug/version-skew",
    scenarioId: "payment-safe-refresh"
  },
  {
    title: "Required update gate",
    icon: ShieldCheck,
    rule: "Block new risky mutations only when the update is required or the API contract is incompatible.",
    hook: "Sensitive mutation guards without page crashes or surprise refreshes.",
    code: simplePatternSnippets.requiredUpdateGate,
    anchor: "src/shared/sensitiveMutationGuard.ts",
    href: "/debug/version-skew",
    scenarioId: "api-contract"
  },
  {
    title: "Asset strategy",
    icon: Braces,
    rule: "Retain old chunks or pin clients to deployments so recovery is the backup, not the normal path.",
    hook: "CDN/static hosting with a defined compatibility window.",
    code: simplePatternSnippets.assetStrategy,
    anchor: "src/shared/assetRetentionSimulator.ts",
    href: "/debug/version-skew"
  }
];

export function SimpleExamplesPage({ routerMode }: { routerMode: RouterMode }) {
  const [, setTick] = useState(0);
  useEffect(() => subscribeVersionState(() => setTick((value) => value + 1)), []);
  const bundle = getBundledReleaseIdentity(routerMode);
  const versionState = getVersionState(routerMode);

  return (
    <div className="page-stack">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Minimal patterns</p>
          <h1>Simple examples</h1>
        </div>
        <span className="badge badge-muted">Small rules, robust paths</span>
      </section>

      <section className="example-state-strip" aria-label="Bundle session latest comparison">
        <div>
          <span>Bundle</span>
          <strong>{bundle.releaseId}</strong>
        </div>
        <div>
          <span>Session</span>
          <strong>{versionState.current.releaseId}</strong>
        </div>
        <div>
          <span>Latest</span>
          <strong>{versionState.latest.releaseId}</strong>
        </div>
        <div>
          <span>Update</span>
          <strong>{versionState.updateAvailable ? versionState.updateSeverity : "none"}</strong>
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
        {examples.map((example, index) => {
          const Icon = example.icon;
          return (
            <article className="example-pattern-card" key={example.title}>
              <div className="example-card-top">
                <Icon aria-hidden="true" />
                <span className="status-chip">Step {index + 1}</span>
              </div>
              <strong>{example.title}</strong>
              <p>{example.rule}</p>
              <pre className="example-code">
                <code>{example.code}</code>
              </pre>
              <div className="example-anchor">
                <span>Study</span>
                <code>{example.anchor}</code>
              </div>
              <span>
                <strong>Robust path:</strong> {example.hook}
              </span>
              <a className="button button-light" href={debugRouteHref(example.href, routerMode, example.scenarioId)}>
                {example.scenarioId ? "Open guided setup" : "Open lab controls"}
              </a>
            </article>
          );
        })}
      </section>
    </div>
  );
}
