# Example: Save Text Safely

This example demonstrates the core build version skew mitigation path for one autosaved text field and one protected action.

## Goal

Prove that a required update does not lose typed text and does not create a duplicate action after refresh/retry.

## Steps

1. Start `pnpm dev:full`.
2. Open `/debug/version-skew?debug=1&router=react`.
3. Click **Start** on the **Save text** control. The button resets simulation state, sets retained-file mode, and opens the draft example.
4. Enter text.
5. Continue to the submit step.
6. Use **Lab controls** in the guided banner, open **Advanced diagnostics**, and select `broken`.
7. Click **Return to example** in the guided banner.
8. Click **Submit action**.
9. Confirm `RequiredUpdateGate` blocks the submit.
10. Click **Refresh safely**.
11. Confirm the draft example resumes.
12. Confirm the text is restored.
13. Submit the action.
14. Retry with the same idempotency key and confirm the server dedupes.

## Expected UI

- Required update gate appears before mutation.
- Build stamp distinguishes bundle, recovered session, latest release, and status, for example `Bundle dev-local / Session release-b / Latest release-b / session recovered`.
- Draft restored notice appears after reload where applicable.
- Duplicate-submit notice appears for idempotent replay.

## Code Anchors

- `src/workflows/SaveRefreshWorkflow.tsx`
- `src/shared/workflowDraftStore.ts`
- `src/shared/idempotencyKeyStore.ts`
- `src/shared/sensitiveMutationGuard.ts`
- `src/shared/versionCheckClient.ts`
- `src/components/UpdateSurfaces.tsx`
- `server/skew-server.ts`

## Test Anchor

See `safe refresh blocks submit, recovers session, and keeps text` and `retry key survives reload` in `tests/version-skew.spec.ts`.
