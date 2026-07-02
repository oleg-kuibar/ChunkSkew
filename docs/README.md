# Knowledge Map

This documentation turns the runnable POC into a searchable knowledge repo for build version skew.

Use it in three modes:

- Learn the failure mode: open `/?debug=1`, read **Solve in this order**, then open `/examples?debug=1`.
- Implement the pattern: use the [Pattern Index](patterns/README.md).
- Reproduce the behavior: use the [Example Index](examples/README.md) and [Retest Runbook](guides/retest-runbook.md).

## Learning Path

| Step | Where | What to prove |
| --- | --- | --- |
| 1 | `/?debug=1` | The four-step mental model and ordered pattern checklist are understandable before source reading. |
| 2 | `/examples?debug=1` | Each minimal rule has tiny source, a test anchor, a robust path, and guided setup. |
| 3 | **Open guided setup** | The app resets state, sets the lab mode, and opens the prepared workflow. |
| 4 | **Lab controls** and **Return to example** | Diagnostics stay opt-in while the prepared workflow remains recoverable. |
| 5 | [Production Checklist](reference/production-checklist.md) | The demo maps to rollout gates for a real React/Vite SPA. |

## Guides

- [Rebuild Audit](audits/rebuild-audit.md): current UX/code friction and the target learning architecture.
- [Build Version Skew](guides/build-version-skew.md): what breaks, why lazy chunks fail, and the layered mitigation model.
- [Retest Runbook](guides/retest-runbook.md): reset state, reproduce stale chunk failure, and verify recovery.
- [Production Rollout Guide](guides/production-rollout-guide.md): a practical rollout sequence for real apps.

## Patterns

- [Pattern Index](patterns/README.md)
- [Release Identity](patterns/release-identity.md)
- [Update Policy Engine](patterns/update-policy-engine.md)
- [Chunk Recovery](patterns/chunk-recovery.md)
- [Autosave And Idempotency](patterns/autosave-and-idempotency.md)
- [Router Lazy Boundaries](patterns/router-lazy-boundaries.md)
- [Asset Retention And Deployment Affinity](patterns/asset-retention-and-deployment-affinity.md)

## Examples

- [Example Index](examples/README.md)
- App route: `/examples?debug=1`
- Simple source: [`../src/examples/simpleVersionSkewPatterns.ts`](../src/examples/simpleVersionSkewPatterns.ts)
- [Payment Safe Refresh](examples/payment-safe-refresh.md)
- [KYB Draft Recovery](examples/kyb-draft-recovery.md)
- [Router Chunk Failure](examples/router-chunk-failure.md)

## Reference

- [Search Index](reference/search-index.md)
- [Glossary](reference/glossary.md)
- [Production Checklist](reference/production-checklist.md)
- [Telemetry And Audit Events](reference/telemetry-and-audit-events.md)

## Code Anchors

The most important implementation anchors are:

- `src/shared/releaseIdentity.ts`
- `src/shared/versionCheckClient.ts`
- `src/shared/updatePolicyEngine.ts`
- `src/shared/chunkErrorClassifier.ts`
- `src/shared/chunkRecoveryController.ts`
- `src/shared/workflowDraftStore.ts`
- `src/shared/idempotencyKeyStore.ts`
- `src/shared/sensitiveMutationGuard.ts`
- `src/shared/preloadWorkflowChunks.ts`
- `src/components/UpdateSurfaces.tsx`
- `src/pages/VersionSkewDebug.tsx`
- `server/skew-server.ts`
- `tests/version-skew.spec.ts`
