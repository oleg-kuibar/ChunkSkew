# Example: KYB Draft Recovery

This example demonstrates draft schema compatibility behavior for a KYB/KYC workflow.

## Goal

Prove that incompatible KYB drafts do not crash the app and are not silently submitted.

## Steps

1. Start `pnpm dev:full`.
2. Open `/debug/version-skew?debug=1&router=react`.
3. Click **Reset simulation state**.
4. Click **Seed incompatible KYB draft**.
5. Open `/kyb/review?debug=1&router=react`.
6. Confirm the app shows a review-required fallback.

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
