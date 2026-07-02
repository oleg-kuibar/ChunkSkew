# Pattern Index

These patterns are reusable pieces for mitigating build version skew in React/Vite SPAs.

| Order | Minimal rule | Robust proof | Pattern doc |
| --- | --- | --- | --- |
| 1 | Compare bundle, session, and latest release. | Build stamps, request headers, and update decisions. | [Release Identity](release-identity.md) |
| 2 | Classify lazy chunk failures and reload once when safe. | React Router, TanStack Router, preload, modal, and drawer fallbacks. | [Chunk Recovery](chunk-recovery.md), [Router Lazy Boundaries](router-lazy-boundaries.md) |
| 3 | Save drafts and idempotency keys before refresh. | Payment safe refresh and KYB draft recovery. | [Autosave And Idempotency](autosave-and-idempotency.md) |
| 4 | Block only risky actions for required updates or incompatible APIs. | Payment, invoice, card, KYB, vendor, role, and API key guards. | [Update Policy Engine](update-policy-engine.md) |
| 5 | Retry with the same key and return the previous result. | Mock backend idempotency replay for sensitive mutations. | [Autosave And Idempotency](autosave-and-idempotency.md) |
| 6 | Retain old chunks or pin clients to deployments. | Asset retention guided setup opens a heavy lazy report that loads instead of falling back. | [Asset Retention And Deployment Affinity](asset-retention-and-deployment-affinity.md) |

Start with `/examples?debug=1` and `src/examples/simpleVersionSkewPatterns.ts` for the minimal rules. Then use the named **Open ... setup** buttons to run each robust proof under fake fintech workflow pressure.

## Cross-Cutting Rule

Do not treat build version skew as only an infrastructure bug. The app needs product-aware UX, workflow preservation, mutation safety, observability, and deploy-time asset strategy.
