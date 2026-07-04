# Example: Old Draft

This example demonstrates draft schema compatibility behavior without tying the check to a product workflow.

## Goal

Prove that incompatible drafts do not crash the app and are not silently submitted.

## Steps

1. Start `pnpm dev:full`.
2. Open `/debug/version-skew?debug=1&router=react`.
3. Click **Start** on the **Old draft** control. The button resets simulation state, seeds the incompatible draft, and opens the old-draft example.
4. Confirm the app shows a check fallback.

## Expected Behavior

- The incompatible draft is detected.
- The workflow asks for a check.
- No protected mutation is submitted automatically.
- The event trace records the draft incompatibility path where applicable.

## Code Anchors

- `src/workflows/BadDraftWorkflow.tsx`
- `src/shared/workflowDraftStore.ts`
- `src/pages/BadDraftReviewRoute.tsx`

## Test Anchor

See `old draft example shows the check fallback` in `tests/version-skew.spec.ts`.
