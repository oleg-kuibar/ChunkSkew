# Retest Runbook

Use this runbook when you want to replay build version skew scenarios from a clean state.

## Start The App

```bash
pnpm dev:full
```

Open:

```text
http://localhost:5173/debug/version-skew?debug=1&router=react
```

## Reset State

Click **Reset simulation state** on the debug page.

The tracked `server/skew-state.json` file is only the seed state. Live mode changes and reset writes go to ignored `.chunk-skew/skew-state.json`, so retesting should not leave a tracked server-state diff.

The reset clears:

- Browser local/session storage for the POC namespace.
- Autosaved drafts.
- MFA state.
- Idempotency keys.
- Version state and recovered release overrides.
- Chunk preload status.
- Telemetry.
- Local skew mode.
- Backend skew mode.
- Backend audit events.
- Backend idempotency records.
- Mutable fake seed data such as payments, invoices, cards, vendors, KYB status, API keys, and user roles.

Manual fallback:

```js
localStorage.clear()
sessionStorage.clear()
location.href = "/debug/version-skew?debug=1&router=react"
```

## Reproduce Missing Chunk Recovery

1. Reset state.
2. Click **Prepare missing chunk fallback** in the guided scenarios.
3. The lab switches to `broken` mode and opens `/payments/create/review`.
4. The simulated lazy chunk failure should show a controlled fallback.
5. The fallback should say that entered information was saved when autosave was active.
6. Telemetry should include `chunk_load_failed`.

Manual path:

1. Reset state.
2. Select `broken` or `no-affinity`.
3. Open `/payments/create/recipient?debug=1&router=react`.
4. Continue through the payment flow to the review step.

## Reproduce Safe Refresh With Autosaved Payment

1. Reset state.
2. Click **Prepare payment recovery** in the guided scenarios.
3. Enter a memo.
4. Continue to MFA.
5. Use **Lab controls** in the guided banner, open **Advanced diagnostics**, then select `broken`.
6. Return to `/payments/create/mfa?debug=1&router=react` and try to submit the payment.
7. Confirm the required update gate appears.
8. Click **Refresh safely**.
9. Confirm the payment flow resumes and the memo is restored.
10. Confirm the build stamp shows bundle and session separately, for example `Bundle dev-local · session release-b`.

## Reproduce API Contract Blocking

1. Reset state.
2. Click **Prepare API contract block** in the guided scenarios.
3. Verify MFA.
4. Attempt the risky payment mutation.
5. The policy should block mutation or move the workflow into read-only behavior.

## Reproduce KYB Draft Recovery

1. Reset state.
2. Click **Prepare KYB draft review** in the guided scenarios.
3. The UI should show a review-required fallback, not crash or submit automatically.

## Verify With Tests

```bash
pnpm exec tsc --noEmit
pnpm test:e2e:windows
pnpm build
```

The canonical behavior lives in `tests/version-skew.spec.ts`.
