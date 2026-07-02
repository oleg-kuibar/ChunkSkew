# Example: Payment Safe Refresh

This example demonstrates the core build version skew mitigation path for a sensitive payment workflow.

## Goal

Prove that a required update does not lose the payment draft and does not create a duplicate payment after refresh/retry.

## Steps

1. Start `pnpm dev:full`.
2. Open `/debug/version-skew?debug=1&router=react`.
3. Click **Prepare payment recovery**. The card resets simulation state, sets retained assets, and opens the payment workflow.
4. Enter a memo.
5. Continue through amount, schedule, review, and MFA.
6. Use **Lab controls** in the guided banner, open **Advanced diagnostics**, and select `broken`.
7. Click **Return to example** in the guided banner.
8. Click **Submit payment**.
9. Confirm `RequiredUpdateGate` blocks the risky mutation.
10. Click **Refresh safely**.
11. Confirm the payment workflow resumes.
12. Confirm the memo is restored.
13. Submit payment.
14. Retry with the same idempotency key and confirm the server dedupes.

## Expected UI

- Required update gate appears before mutation.
- Build stamp distinguishes bundle, recovered session, and latest release, for example `Bundle dev-local / Session release-b / Latest release-b`.
- Draft restored notice appears after reload where applicable.
- Duplicate-submit notice appears for idempotent replay.

## Code Anchors

- `src/workflows/PaymentWorkflow.tsx`
- `src/shared/workflowDraftStore.ts`
- `src/shared/idempotencyKeyStore.ts`
- `src/shared/sensitiveMutationGuard.ts`
- `src/shared/versionCheckClient.ts`
- `src/components/UpdateSurfaces.tsx`
- `server/skew-server.ts`

## Test Anchor

See `7b. Refresh safely resumes an autosaved payment workflow` and duplicate-submit tests in `tests/version-skew.spec.ts`.
