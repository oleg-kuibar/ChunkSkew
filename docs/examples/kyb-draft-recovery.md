# Example: KYB Draft Recovery

This example demonstrates draft schema compatibility behavior for a KYB/KYC workflow.

## Goal

Prove that incompatible KYB drafts do not crash the app and are not silently submitted.

## Steps

1. Start `pnpm dev:full`.
2. Open `/debug/version-skew?debug=1&router=react`.
3. Click **Prepare KYB draft review**. The card resets simulation state, seeds the incompatible draft, and opens KYB review.
4. Confirm the app shows a review-required fallback.

## Expected Behavior

- The incompatible draft is detected.
- The workflow asks for review.
- No KYB mutation is submitted automatically.
- Telemetry/audit records the draft incompatibility path where applicable.

## Code Anchors

- `src/workflows/KybWorkflow.tsx`
- `src/shared/workflowDraftStore.ts`
- `src/workflows/KybDocumentsStep.tsx`
- `src/pages/KybReviewRoute.tsx`

## Test Anchor

See `21. Incompatible KYB draft schema shows review-required fallback` in `tests/version-skew.spec.ts`.
