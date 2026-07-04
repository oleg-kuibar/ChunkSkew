# Production Rollout Guide

This guide turns the POC into a practical rollout sequence for an existing React SPA.

## Phase 1: Measure Before Blocking

Add release metadata and a readable event trace first.

- Generate a build release ID.
- Publish `/version.json`.
- Include release, deployment, router mode, API contract, and feature flag snapshot in requests.
- Track chunk failures, update detection, mutation blocking, draft restore, and duplicate-submit prevention.
- Do not immediately force refreshes or block workflows.

Code anchors:

- `src/shared/releaseIdentity.ts`
- `src/shared/versionCheckClient.ts`
- `src/shared/telemetry.ts`
- `src/shared/apiClient.ts`

## Phase 2: Preserve Protected Work

Add autosave and idempotency to flows where a reload would hurt.

- Draft creation or editing.
- Lazy check steps.
- Draft review and submit.
- Related-record creation.
- Role and API key changes.

Code anchors:

- `src/shared/workflowDraftStore.ts`
- `src/shared/idempotencyKeyStore.ts`
- `src/shared/sensitiveMutationGuard.ts`
- `src/workflows/SaveRefreshWorkflow.tsx`
- `src/workflows/BadDraftWorkflow.tsx`

## Phase 3: Add Lazy Boundary Recovery

Wrap lazy routes and components in router-specific recovery boundaries.

- React Router route modules should use a lazy wrapper that classifies import errors.
- TanStack Router lazy routes should have equivalent error/pending behavior.
- Global Vite `vite:preloadError` should be caught before app render.

Code anchors:

- `src/shared/lazyRoute.ts`
- `src/router/reactRouter.tsx`
- `src/router/tanstackRouter.tsx`
- `src/shared/chunkRecoveryController.ts`
- `src/main.tsx`

## Phase 4: Add Product Policy

Use update severity and workflow context to decide the UX.

- Optional: passive toast.
- Recommended: sticky banner during protected work.
- Required: block next risky mutation; preserve draft; offer safe refresh.
- Incompatible API: readonly/block risky mutation.
- Chunk failure: controlled fallback.

Code anchor:

- `src/shared/updatePolicyEngine.ts`

## Phase 5: Harden Deployment

Infrastructure should reduce how often the client needs recovery.

- Revalidate `index.html`.
- Serve hashed assets immutable.
- Retain old assets for 24-72 hours.
- Consider deployment affinity for long-running sessions.
- Do not stream executable chunks over SSE/WebSocket.
- Do not use service workers to silently mix incompatible releases.

Code anchors:

- `server/skew-server.ts`
- `src/shared/assetRetentionSimulator.ts`
- `src/shared/deploymentAffinityClient.ts`
- `src/shared/serviceWorkerRegistration.ts`

## Phase 6: Tighten Gates

Only after the event trace and recovery are working:

- Block risky mutations for required updates.
- Block or readonly incompatible API contracts.
- Add alerting for reload loops and repeated chunk failures.
- Keep escape hatches for support/debug.

## Done Criteria

- Old tabs can detect a new release.
- Dirty drafts are not force-refreshed.
- Pending mutations are never interrupted.
- Required updates block risky new mutations.
- Autosaved drafts restore after reload.
- Idempotency prevents duplicate submits.
- Missing files show controlled recovery.
- Tests cover React Router and TanStack Router paths.
