# Build Version Skew

Build version skew happens when a user keeps release A open while release B is deployed. The app shell in the browser still executes release A JavaScript, but the server or CDN may now expose release B assets. If release A later imports a lazy chunk that no longer exists, navigation can fail in the middle of a workflow.

Common search terms for this problem include version skew, build skew, stale chunks, missing chunks, lazy chunk 404, dynamic import failure, Vite preload error, module preload failure, `ChunkLoadError`, and safe refresh.

## Why It Matters

In a simple content app, a failed lazy chunk is annoying. In any app with drafts or protected actions, it can be dangerous:

- A review route may fail after the user entered a draft.
- A lazy check step may fail while the user is reviewing saved work.
- A bad draft schema may need review before submit.
- A retry after reload may duplicate a protected mutation unless idempotency is enforced.

## The Failure Path

1. User opens release A.
2. Release B deploys.
3. The user continues in the old tab.
4. The user navigates to a lazy route, drawer, or review step.
5. The browser requests a release A chunk.
6. Old assets are missing, expired, or no longer routed by the CDN.
7. The import rejects with a chunk/preload/module error.
8. Without recovery, the app crashes or loses workflow state.

## Mitigation Layers

ChunkSkew uses layered protection instead of pretending one technique solves everything.

| Layer | Purpose | Code anchor |
| --- | --- | --- |
| Release identity | Know bundle, session, latest release, deployment, API contract | `src/shared/releaseIdentity.ts` |
| Version checks | Detect latest release via polling, focus, reconnect, route transition, SSE/WebSocket | `src/shared/versionCheckClient.ts` |
| Update policy | Decide toast, banner, block, readonly, safe refresh, or fallback | `src/shared/updatePolicyEngine.ts` |
| Chunk classification | Recognize Vite, dynamic import, CSS, and ChunkLoadError failures | `src/shared/chunkErrorClassifier.ts` |
| Chunk recovery | Reload once, prevent loops, show controlled fallback | `src/shared/chunkRecoveryController.ts` |
| Workflow drafts | Preserve draft and check-step state | `src/shared/workflowDraftStore.ts` |
| Idempotency | Prevent duplicate sensitive mutations after refresh/retry | `src/shared/idempotencyKeyStore.ts` and `server/skew-server.ts` |
| Mutation guard | Block submit when required update or incompatible API is pending | `src/shared/sensitiveMutationGuard.ts` |
| Asset strategy | Retain old assets or pin clients to deployment affinity | `src/shared/assetRetentionSimulator.ts` and `server/skew-server.ts` |

## Recommended Product Behavior

- Optional update: show passive awareness.
- Recommended update: let current workflow continue, prompt at a safe point.
- Required update: preserve work, block new risky mutation/navigation, offer safe refresh.
- API contract incompatible: allow review/read-only where safe, block mutation.
- Chunk already failed: show a recovery fallback, not a generic crash.
- Mutation pending: never reload until it settles.
- Dirty form or challenge pending: never force refresh.

## What Safe Refresh Means Here

Safe refresh is not live patching the running JavaScript. It is a controlled reload path that preserves workflow state first.

In this POC, `prepareSafeRefresh(routerMode)` stores the latest release as the recovered session release, updates the version state, and then the UI reloads. The build stamp still distinguishes the real loaded bundle from the simulated session release:

```text
Bundle dev-local / Session release-b / Latest release-b / session recovered
```

That distinction is important: the browser bundle did not magically change before reload; the recovery state changed so the workflow can continue in the simulation.

## Production Architecture

A real production rollout usually needs all of these:

- `index.html` served with `no-cache` or revalidation.
- Hashed JS/CSS assets served immutable.
- Old hashed assets retained for a compatibility window, often 24-72 hours.
- Runtime `/version.json` with release, deployment, API contract, and minimum supported client release.
- Release awareness via polling plus SSE or WebSocket notifications.
- Router-specific lazy import boundaries.
- Autosave and draft schema migration for critical workflows.
- Idempotency keys for every sensitive mutation.
- Telemetry before tightening update policy.
- Backend API compatibility windows and readonly/blocking modes.

## Where To Continue

- To test the behavior, read [Retest Runbook](retest-runbook.md).
- To implement pieces, read [Pattern Index](../patterns/README.md).
- To map terms people search for, read [Search Index](../reference/search-index.md).
