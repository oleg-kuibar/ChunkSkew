import { Braces, FileWarning, GitBranch, KeyRound, RefreshCcw, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { getBundledReleaseIdentity } from "../shared/releaseIdentity";
import { getVersionState, subscribeVersionState } from "../shared/versionCheckClient";
import type { RouterMode } from "../shared/types";

const examples = [
  {
    title: "Release identity",
    icon: GitBranch,
    rule: "Always compare the loaded bundle, the session release, and the latest release as separate facts.",
    hook: "Use this before rendering badges, sending request headers, or deciding whether an update is pending.",
    code: "bundle !== session !== latest",
    href: "/debug/version-skew"
  },
  {
    title: "Chunk recovery",
    icon: FileWarning,
    rule: "Classify lazy import failures, reload once when safe, then stop and show a controlled fallback.",
    hook: "Use this around route imports, modal imports, Vite preload errors, and router error boundaries.",
    code: "try import() -> classify -> recover",
    href: "/payments/create/review"
  },
  {
    title: "Safe refresh",
    icon: RefreshCcw,
    rule: "Save draft and idempotency context before refreshing an old tab onto the latest release.",
    hook: "Use this from required update gates, sticky banners, and chunk failure fallbacks.",
    code: "save workflow -> prepare refresh -> reload",
    href: "/payments/create/recipient"
  },
  {
    title: "Idempotent mutation",
    icon: KeyRound,
    rule: "Retry the same sensitive action with the same key and return the previous result.",
    hook: "Use this for payment submit, approval, card controls, KYB submit, vendors, roles, and API keys.",
    code: "same key -> same result",
    href: "/payments/create/mfa"
  },
  {
    title: "Required update gate",
    icon: ShieldCheck,
    rule: "Block new risky mutations only when the update is required or the API contract is incompatible.",
    hook: "Use this in mutation guards, not as a global page crash or surprise refresh.",
    code: "required ? block risky : allow",
    href: "/debug/version-skew"
  },
  {
    title: "Asset strategy",
    icon: Braces,
    rule: "Retain old chunks or pin clients to deployments so recovery is the backup, not the normal path.",
    hook: "Use this at the CDN/static-host layer with a defined compatibility window.",
    code: "retain assets + revalidate shell",
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
        <span className="badge badge-muted">Small rules, real hooks</span>
      </section>

      <section className="example-state-strip" aria-label="Current release comparison">
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

      <section className="example-pattern-grid" data-testid="simple-examples">
        {examples.map((example) => {
          const Icon = example.icon;
          return (
            <article className="example-pattern-card" key={example.title}>
              <Icon aria-hidden="true" />
              <strong>{example.title}</strong>
              <p>{example.rule}</p>
              <div className="example-code">{example.code}</div>
              <span>{example.hook}</span>
              <a className="button button-light" href={withRouter(example.href, routerMode)}>
                Open robust example
              </a>
            </article>
          );
        })}
      </section>
    </div>
  );
}

function withRouter(path: string, routerMode: RouterMode) {
  const router = routerMode === "tanstack-router" ? "tanstack" : "react";
  return `${path}?debug=1&router=${router}`;
}
