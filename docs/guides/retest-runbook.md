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
2. Select `asset-retention`.
3. Open `/payments/create/recipient?debug=1&router=react`.
4. Enter a memo.
5. Continue to MFA.
6. Force a required update by selecting `broken`.
7. Try to submit the payment.
8. Confirm the required update gate appears.
9. Click **Refresh safely**.
10. Confirm the payment flow resumes and the memo is restored.
11. Confirm the build stamp shows bundle and session separately, for example `Bundle dev-local · session release-b`.

## Reproduce API Contract Blocking

1. Reset state.
2. Select `api-contract-incompatible`.
3. Open a sensitive workflow.
4. Attempt a risky mutation.
5. The policy should block mutation or move the workflow into read-only behavior.

## Reproduce KYB Draft Recovery

1. Reset state.
2. Click **Seed incompatible KYB draft**.
3. Open `/kyb/review?debug=1&router=react`.
4. The UI should show a review-required fallback, not crash or submit automatically.

## Verify With Tests

```bash
pnpm exec tsc --noEmit
pnpm test:e2e:windows
pnpm build
```

The canonical behavior lives in `tests/version-skew.spec.ts`.
