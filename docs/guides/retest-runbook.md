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

From Simple examples, click **Reset or retest** to open Lab controls. Click **Reset simulation state** there when replaying a manual path or clearing the whole lab.

After the reload, the Lab controls page shows a reset confirmation strip; the build stamp should read `Session dev-local` with `in sync` status again unless you prepare another scenario.

Guided scenario cards reset automatically before they prepare a scenario, so you do not need a separate reset click before **Prepare payment recovery**, **Prepare missing chunk fallback**, **Prepare KYB draft review**, or **Prepare API contract block**.

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

1. Click **Prepare missing chunk fallback** in the guided scenarios.
2. The lab resets, switches to `broken` mode, and opens `/payments/create/review`.
3. The simulated lazy chunk failure should show a controlled fallback.
4. The fallback should say that entered information was saved when autosave was active.
5. Telemetry should include `chunk_load_failed`.

Manual path:

1. Reset state.
2. Select `broken` or `no-affinity`.
3. Open `/payments/create/recipient?debug=1&router=react`.
4. Continue through the payment flow to the review step.

## Reproduce Safe Refresh With Autosaved Payment

1. Click **Prepare payment recovery** in the guided scenarios.
2. The lab resets, switches to retained assets, and opens the payment workflow.
3. Enter a memo.
4. Continue to MFA.
5. Use **Lab controls** in the guided banner, open **Advanced diagnostics**, then select `broken`.
6. Click **Return to example** in the guided banner, continue back to MFA if needed, and try to submit the payment.
7. Confirm the required update gate appears.
8. Click **Refresh safely**.
9. Confirm the payment flow resumes and the memo is restored.
10. Confirm the build stamp shows bundle, session, latest, and status separately, for example `Bundle dev-local / Session release-b / Latest release-b / session recovered`.

## Reproduce API Contract Blocking

1. Click **Prepare API contract block** in the guided scenarios.
2. The lab resets, switches to API-contract-incompatible mode, and opens the risky payment step.
3. Verify MFA.
4. Attempt the risky payment mutation.
5. The policy should block mutation or move the workflow into read-only behavior.

## Reproduce KYB Draft Recovery

1. Click **Prepare KYB draft review** in the guided scenarios.
2. The lab resets, seeds an incompatible draft, and opens KYB review.
3. The UI should show a review-required fallback, not crash or submit automatically.

## Verify With Tests

```bash
pnpm exec tsc --noEmit
pnpm test:learning:windows
pnpm test:e2e:windows
pnpm build
```

The shortest proof for the learning path is `pnpm test:learning:windows`. It covers the start page baseline, simple source examples, pure update-policy decisions, the rendered `/examples` page, mobile fit, keyboard access to reset/retest, named setup links into prepared robust workflows, **Return to example**, and reset confirmation. The full behavior suite lives in `tests/version-skew.spec.ts`.
