# Build Version Skew Knowledge Repo

ChunkSkew is a standalone React/Vite knowledge repo for learning, testing, and documenting build version skew mitigation in non-Next.js single page apps.

If someone searches this repo for **build version skew**, **version skew**, **stale chunks**, **Vite preload error**, **ChunkLoadError**, **safe refresh**, **asset retention**, or **deployment affinity**, they should land here and find both the runnable POC and the reusable engineering patterns.

This repo uses fake deterministic data only. It does not import from, inspect, or depend on any production app.

## Start Here

Fast path for learning and proving the pattern:

1. Open `/?debug=1` and read the three tiny examples: old tab, saved draft, blocked submit.
2. Open `/examples?debug=1` for the same three rows without optional setup clutter.
3. Open **Lab controls** when you want to prepare missing-file, old-draft, retained-file, or reset scenarios.
4. Use **Return to example** in the guided banner to continue the prepared example after inspecting controls.
5. Prove the article path with:

```bash
pnpm test:article
```

- [Knowledge map](docs/README.md): guide, pattern, example, and reference index.
- [Rebuild audit](docs/audits/rebuild-audit.md): current friction and the target learning architecture.
- [Completion readiness audit](docs/audits/completion-readiness-audit.md): pasted brief versus current checks and remaining partials.
- [Build version skew guide](docs/guides/build-version-skew.md): the core explanation and mitigation model.
- [Retest runbook](docs/guides/retest-runbook.md): how to reset state and replay the examples.
- [Pattern index](docs/patterns/README.md): reusable implementation patterns with code anchors.
- [Examples index](docs/examples/README.md): safe refresh, bad draft, missing chunk, and retained asset scenarios.
- [Search index](docs/reference/search-index.md): keywords and synonyms people are likely to use.
- [Production checklist](docs/reference/production-checklist.md): rollout gates for real apps.

## What The Repo Demonstrates

- Runtime release identity through `import.meta.env.VITE_RELEASE_ID`, generated `/version.json`, and visible bundle/session/latest/status build stamps.
- Polling, focus/reconnect checks, route-transition checks, and SSE/WebSocket release awareness.
- Chunk error classification for Vite preload failures, dynamic import failures, `ChunkLoadError`, and missing CSS/JS assets.
- Safe refresh behavior that preserves autosaved draft state and idempotency keys.
- React Router v6 lazy route recovery and TanStack Router lazy route recovery.
- Sensitive mutation guards for protected actions that must not run on an incompatible client.
- Mock backend idempotency replay to prevent duplicate submissions.
- A readable event trace that can later map to production observability.
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
- Lab controls: `http://localhost:5173/debug/version-skew?debug=1`

Use the topbar router switch to replay the same route in React Router or TanStack Router mode.

If you prefer separate terminals:

```bash
pnpm dev:mock
pnpm dev
```

## Reset State To Retest

Open Lab controls at `/debug/version-skew?debug=1` and click **Reset simulation state**.

After reload, the page shows a reset confirmation strip and the build stamp should return to `Session dev-local` with `in sync` status unless another scenario is prepared.

Guided example buttons reset automatically before they prepare a scenario, so a manual reset is only needed before custom/manual replay.

That clears browser-side drafts, idempotency keys, version overrides, preload state, the event log, and local skew mode. It also resets backend skew mode, stored events, idempotency records, and mutable fake seed data.

Live skew mode is written to ignored `.chunk-skew/skew-state.json`. The tracked `server/skew-state.json` is only the seed state, so retests should not dirty it.

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
pnpm test:article
pnpm test:article:windows
pnpm test:learning:windows
pnpm test:e2e
pnpm test:e2e:windows
pnpm build
```

On this Codex/WSL setup, the Windows wrapper is the reliable browser path:

```bash
pnpm test:article:windows
pnpm test:e2e:windows
```

## Repo Layout

```text
docs/
  guides/       Narrative guides and testing runbooks
  patterns/     Reusable implementation patterns
  examples/     Three small version-skew examples
  reference/    Glossary, search index, production checklist
server/         Mock backend, release bus, skew-mode simulator
src/
  components/   Update surfaces, badges, event trace UI, error boundaries
  examples/     Tiny copy-paste version skew patterns
  pages/        Guided example pages and debug controls
  router/       React Router and TanStack Router shells
  shared/       Release, recovery, policy, events, drafts, guards
  workflows/    Shared example flows used by the lazy routes
tests/          Playwright version-skew matrix
```

## Non-Goals

ChunkSkew does not implement production HMR, streaming executable JS chunks, live module patching, real money movement, real banking integrations, real auth, real customer data, automatic migration of a production app, or coupling to a production codebase.
