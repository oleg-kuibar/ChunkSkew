# Pattern Index

These patterns are reusable pieces for mitigating build version skew in React/Vite SPAs.

| Pattern | Problem it solves | Start here |
| --- | --- | --- |
| Release identity | Distinguish loaded bundle, recovered session, latest release, and API contract | [Release Identity](release-identity.md) |
| Update policy engine | Decide whether to toast, banner, defer, block, readonly, or recover | [Update Policy Engine](update-policy-engine.md) |
| Chunk recovery | Catch lazy import/preload failures and prevent reload loops | [Chunk Recovery](chunk-recovery.md) |
| Autosave and idempotency | Preserve user work and prevent duplicate sensitive actions | [Autosave And Idempotency](autosave-and-idempotency.md) |
| Router lazy boundaries | Apply recovery to React Router and TanStack Router separately | [Router Lazy Boundaries](router-lazy-boundaries.md) |
| Asset retention and deployment affinity | Reduce missing chunks at the hosting/CDN layer | [Asset Retention And Deployment Affinity](asset-retention-and-deployment-affinity.md) |

## Cross-Cutting Rule

Do not treat build version skew as only an infrastructure bug. The app needs product-aware UX, workflow preservation, mutation safety, observability, and deploy-time asset strategy.
