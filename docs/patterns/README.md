# Pattern Index

These patterns are reusable pieces for mitigating build version skew in React/Vite SPAs.

| Order | Minimal rule | Prepared example | Pattern doc |
| --- | --- | --- | --- |
| 1 | Compare bundle, session, and latest release. | Build stamps, request headers, and update decisions. | [Release Identity](release-identity.md) |
| 2 | Classify lazy chunk failures and reload once when safe. | React Router, TanStack Router, preload, and drawer fallbacks. | [Chunk Recovery](chunk-recovery.md), [Router Lazy Boundaries](router-lazy-boundaries.md) |
| 3 | Save drafts and idempotency keys before refresh. | Save-refresh and bad-draft examples. | [Autosave And Idempotency](autosave-and-idempotency.md) |
| 4 | Block only submits for required updates or incompatible APIs. | Protected action guards across submit and admin actions. | [Update Policy Engine](update-policy-engine.md) |
| 5 | Retry with the same key and return the previous result. | Mock backend idempotency replay for sensitive mutations. | [Autosave And Idempotency](autosave-and-idempotency.md) |
| 6 | Retain old chunks or pin clients to deployments. | Asset retention guided setup opens a heavy lazy report that loads instead of falling back. | [Asset Retention And Deployment Affinity](asset-retention-and-deployment-affinity.md) |

Start with `/examples?debug=1` and `src/examples/simpleVersionSkewPatterns.ts` for the minimal rules. Then use Lab controls to run prepared examples under real lazy-loading pressure.

## Cross-Cutting Rule

Do not treat build version skew as only an infrastructure bug. The app needs saved work, guarded actions, observability, and deploy-time asset strategy.
