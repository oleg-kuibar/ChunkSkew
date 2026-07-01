# Build Version Skew Knowledge Repo

ChunkSkew is a standalone React/Vite knowledge repo for learning, testing, and documenting build version skew mitigation in non-Next.js single page apps.

If someone searches this repo for **build version skew**, **version skew**, **stale chunks**, **Vite preload error**, **ChunkLoadError**, **safe refresh**, **asset retention**, or **deployment affinity**, they should land here and find both the runnable POC and the reusable engineering patterns.

This repo uses fake deterministic fintech data only. It does not import from, inspect, or depend on any production app.

## Start Here

- [Knowledge map](docs/README.md): guide, pattern, example, and reference index.
- [Rebuild audit](docs/audits/rebuild-audit.md): current friction and the target learning architecture.
- [Build version skew guide](docs/guides/build-version-skew.md): the core explanation and mitigation model.
- [Retest runbook](docs/guides/retest-runbook.md): how to reset state and replay the demos.
- [Pattern index](docs/patterns/README.md): reusable implementation patterns with code anchors.
- [Examples index](docs/examples/README.md): payment, KYB, invoice, card, and router scenarios.
- [Search index](docs/reference/search-index.md): keywords and synonyms people are likely to use.
- [Production checklist](docs/reference/production-checklist.md): rollout gates for real apps.

## What The Repo Demonstrates

- Runtime release identity through `import.meta.env.VITE_RELEASE_ID`, generated `/version.json`, and visible bundle/session/latest build stamps.
- Polling, focus/reconnect checks, route-transition checks, and SSE/WebSocket release awareness.
- Chunk error classification for Vite preload failures, dynamic import failures, `ChunkLoadError`, and missing CSS/JS assets.
- Safe refresh behavior that preserves autosaved workflow state and idempotency keys.
- React Router v6 lazy route recovery and TanStack Router lazy route recovery.
- Sensitive mutation guards for payment, invoice, card, KYB, vendor, role, and API key actions.
- Mock backend idempotency replay to prevent duplicate submissions.
- Audit and telemetry events that can later map to Datadog, Bugsnag, Sentry, or OpenTelemetry.
- Deployment mode simulations: `no-affinity`, `affinity`, `asset-retention`, `broken`, `compatibility-window-expired`, and `api-contract-incompatible`.

## Run The Knowledge App

```bash
pnpm install
pnpm dev:full
```

Open:

- React Router mode: `http://localhost:5173/?debug=1&router=react`
- TanStack Router mode: `http://localhost:5173/?debug=1&router=tanstack`
- Simple examples: `http://localhost:5173/examples?debug=1`
- Version skew controls: `http://localhost:5173/debug/version-skew?debug=1`

Use the topbar router switch to replay the same route in React Router or TanStack Router mode.

If you prefer separate terminals:

```bash
pnpm dev:mock
pnpm dev
```

## Reset State To Retest

Open `/debug/version-skew?debug=1` and click **Reset simulation state**.

That clears browser-side drafts, MFA state, idempotency keys, version overrides, preload state, telemetry, and local skew mode. It also resets backend skew mode, audit events, idempotency records, and mutable fake seed data.

Manual browser-console fallback:

```js
localStorage.clear()
sessionStorage.clear()
location.href = "/debug/version-skew?debug=1&router=react"
```

## Release And Skew Scripts

```bash
pnpm build:release-a
pnpm build:release-b
pnpm serve:skew
pnpm simulate:delete-old-assets
pnpm simulate:retain-old-assets
pnpm simulate:expire-compat-window
pnpm simulate:api-contract-incompatible
```

## Verify

```bash
pnpm exec tsc --noEmit
pnpm test:e2e
pnpm test:e2e:windows
pnpm build
```

On this Codex/WSL setup, the Windows wrapper is the reliable browser path:

```bash
pnpm test:e2e:windows
```

## Repo Layout

```text
docs/
  guides/       Narrative guides and testing runbooks
  patterns/     Reusable implementation patterns
  examples/     Workflow and router examples
  reference/    Glossary, search index, production checklist
server/         Mock backend, release bus, skew-mode simulator
src/
  components/   Update surfaces, badges, audit UI, error boundaries
  examples/     Tiny copy-paste version skew patterns
  pages/        Fintech screens and debug controls
  router/       React Router and TanStack Router shells
  shared/       Release, recovery, policy, telemetry, drafts, guards
  workflows/    Payment, KYB, invoice modal, transaction drawer
tests/          Playwright version-skew matrix
```

## Non-Goals

ChunkSkew does not implement production HMR, streaming executable JS chunks, live module patching, real money movement, real banking integrations, real auth, real customer data, automatic migration of a production app, or coupling to a production codebase.
