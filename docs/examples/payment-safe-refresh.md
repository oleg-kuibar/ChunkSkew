# Example: Payment Safe Refresh

This example demonstrates the core build version skew mitigation path for a sensitive payment workflow.

## Goal

Prove that a required update does not lose the payment draft and does not create a duplicate payment after refresh/retry.

## Steps

1. Start `pnpm dev:full`.
2. Open `/debug/version-skew?debug=1&router=react`.
3. Click **Reset simulation state**.
4. Select `asset-retention`.
5. Open `/payments/create/recipient?debug=1&router=react`.
6. Enter a memo.
7. Continue through amount, schedule, review, and MFA.
8. Select `broken` in the debug page or force a required update.
9. Click **Submit payment**.
10. Confirm `RequiredUpdateGate` blocks the risky mutation.
11. Click **Refresh safely**.
12. Confirm the payment workflow resumes.
13. Confirm the memo is restored.
14. Submit payment.
15. Retry with the same idempotency key and confirm the server dedupes.

## Expected UI

- Required update gate appears before mutation.
- Build stamp distinguishes bundle and session, for example `Bundle dev-local · session release-b`.
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
