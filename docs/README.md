# Knowledge Map

This documentation turns the runnable POC into a searchable knowledge repo for build version skew.

Use it in three modes:

- Learn the failure mode: open `/?debug=1`, read the three tiny examples, then open `/examples?debug=1`.
- Implement the pattern: use the [Pattern Index](patterns/README.md).
- Reproduce the behavior: use the [Example Index](examples/README.md) and [Retest Runbook](guides/retest-runbook.md).

## Learning Path

| Step | Where | What to prove |
| --- | --- | --- |
| 1 | `/?debug=1` | Three examples explain the whole first pass: old tab, saved draft, blocked submit. |
| 2 | `/examples?debug=1` | The simple examples stay plain: three rows, reset link, build stamp. |
| 3 | **Lab controls** | Optional prepared examples reset state, set the lab mode, and open one focused route. |
| 4 | **Return to example** | Diagnostics stay opt-in while the prepared example remains recoverable. |
| 5 | [Production Checklist](reference/production-checklist.md) | The lab maps to rollout gates for a real React/Vite SPA. |

## Guides

- [Rebuild Audit](audits/rebuild-audit.md): current UX/code friction and the target learning architecture.
- [Completion Readiness Audit](audits/completion-readiness-audit.md): pasted brief versus current checks, including remaining partials.
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
- Standalone/fake-data/release-awareness contract check: [`../tests/project-contract.spec.ts`](../tests/project-contract.spec.ts)
- Simple source: [`../src/examples/simpleVersionSkewPatterns.ts`](../src/examples/simpleVersionSkewPatterns.ts)
- Simple source and docs vocabulary check: [`../tests/simple-patterns.spec.ts`](../tests/simple-patterns.spec.ts)
- Pure policy check: [`../tests/update-policy.spec.ts`](../tests/update-policy.spec.ts)
- Mutation metadata check: [`../tests/api-client.spec.ts`](../tests/api-client.spec.ts)
- [Save Text Safely](examples/save-text-safe-refresh.md)
- [Old Draft](examples/old-draft-recovery.md)
- [Router Chunk Failure](examples/router-chunk-failure.md)

## Reference

- [Search Index](reference/search-index.md)
- [Glossary](reference/glossary.md)
- [Production Checklist](reference/production-checklist.md)
- [Event Trace](reference/telemetry-and-audit-events.md)

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
- `tests/learning-path.spec.ts`
- `tests/version-skew.spec.ts`
