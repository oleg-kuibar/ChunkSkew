# Production Checklist

Use this checklist before enforcing strict build version skew behavior in a real app.

## Ordered Rollout Map

Use the same order as the app's **Solve in this order** checklist. Start from `/examples?debug=1`: each card shows a `Minimal rule`, a `Robust source`, and a named proof setup before you apply the production gate.

| Order | Production gate |
| --- | --- |
| 1. Detect release skew | Build release metadata, `/version.json`, release bus, request headers, and telemetry. |
| 2. Recover lazy chunks | Router-specific lazy wrappers, Vite preload handling, controlled fallback, and reload-loop prevention. |
| 3. Preserve work | Draft autosave, schema compatibility, MFA safety, and idempotency keys that survive refresh. |
| 4. Gate risky actions | Update policy, required-update gates, API compatibility blocking, and readonly fallback. |
| 5. Prove no duplicates | Backend idempotency replay plus tests for retries after refresh or chunk failure. |
| 6. Host for compatibility | No-cache HTML, immutable hashed assets, retained old chunks, and deployment affinity where needed. |

## Build And Hosting

- `index.html` is revalidated or served with `no-cache`.
- Hashed JS/CSS assets are immutable.
- Old assets are retained for a defined compatibility window.
- Release metadata is generated during build.
- `/version.json` is served with `cache-control: no-store`.
- CDN behavior for old release folders is tested.

## Runtime Release Awareness

- App reads bundled release identity.
- App checks latest release on startup.
- App checks latest release on focus, reconnect, and route transition.
- App can receive release notifications through SSE or WebSocket.
- App distinguishes bundle release, session release, and latest release.

## Router Recovery

- React Router lazy routes are wrapped or guarded.
- TanStack Router lazy routes/components have equivalent recovery.
- Global Vite preload errors are handled.
- Chunk failures are classified before recovery.
- Reload loops are prevented.
- Normal users do not see raw stack traces.

## Workflow Preservation

- Sensitive workflows autosave drafts.
- Drafts include schema version and compatibility metadata.
- Incompatible drafts show review-required fallback.
- Idempotency keys survive refresh.
- Pending mutations are not interrupted by refresh.

## Mutation Safety

- Every sensitive mutation sends idempotency key, release ID, deployment ID, router mode, user ID, organization ID, API contract version, mutation intent, and timestamp.
- Required update blocks new risky mutation.
- API contract incompatibility blocks mutation or switches to read-only.
- Duplicate retry returns previous result.

## Observability

- Version checks are tracked.
- Release availability and required updates are tracked.
- Chunk failures and reload-loop prevention are tracked.
- Blocked mutations are tracked.
- Draft restore and duplicate-submit prevention are tracked.
- Audit events are recorded for sensitive workflow recovery.

## Product UX

- Optional update shows passive awareness.
- Recommended update prompts at safe points.
- Required update explains that work is saved.
- Dirty form is not force-refreshed.
- MFA is not interrupted.
- Mutation pending state is not refreshed.
- Copy is calm and non-technical.
