# Production Checklist

Use this checklist before enforcing strict build version skew behavior in a real app.

## Ordered Rollout Map

Use the same order as the app's three-example learning path. Start from `/examples?debug=1`: the page shows three plain rows, a reset link, and the current build stamp.

| Order | Production gate |
| --- | --- |
| 1. Detect release skew | Build release metadata, `/version.json`, release bus, request headers, and an event trace. |
| 2. Preserve work | Draft autosave, retry keys, schema compatibility, and safe refresh. |
| 3. Block submit | Required-update gates, API compatibility blocking, and duplicate-submit prevention. |

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

## Draft Preservation

- Protected routes autosave drafts.
- Drafts include schema version and compatibility metadata.
- Incompatible drafts show a check fallback.
- Idempotency keys survive refresh.
- Pending mutations are not interrupted by refresh.

## Mutation Safety

- Every sensitive mutation sends idempotency key, release ID, deployment ID, router mode, user ID, organization ID, API contract version, mutation intent, and timestamp.
- Required update blocks new submit.
- API contract incompatibility blocks mutation or switches to read-only.
- Duplicate retry returns previous result.

## Event Trace

- Version checks appear in the trace.
- Release availability and required updates appear in the trace.
- Chunk failures and reload-loop prevention appear in the trace.
- Blocked actions appear in the trace.
- Draft restore and duplicate-submit prevention appear in the trace.
- Raw event plumbing can feed production observability later.

## User UX

- Optional update shows passive awareness.
- Recommended update prompts at safe points.
- Required update explains that work is saved.
- Dirty form is not force-refreshed.
- Confirmation challenge is not interrupted.
- Mutation pending state is not refreshed.
- Copy is calm and non-technical.
