# Pattern: Update Policy Engine

The update policy engine turns release state plus workflow context into a product decision.

## Problem

An app should not blindly reload when a new build exists. It also should not allow risky mutations if the backend contract is incompatible or a required update is pending.

## Inputs

The POC policy considers:

- Current route and router mode.
- Workflow type.
- Dirty form state.
- Pending mutation state.
- Pending navigation state.
- MFA state.
- Sensitive workflow flag.
- Chunk failure state.
- Preloaded workflow chunks.
- Asset retention and deployment affinity.
- API contract compatibility.

## Decisions

The policy can return:

- `passive-toast`
- `sticky-banner`
- `defer-until-save`
- `block-new-navigation`
- `block-next-sensitive-mutation`
- `force-refresh-after-current-action`
- `show-chunk-failure-fallback`
- `allow-current-step-only`
- `allow-readonly-mode`
- `silent-reload-if-idle`

## Code Anchor

- `decideUpdatePolicy(input)` in `src/shared/updatePolicyEngine.ts`

## Rules Of Thumb

- Never reload while a mutation is pending.
- Never reload while the user is typing in a dirty form.
- Never reload during MFA.
- Optional updates should not block work.
- Recommended updates should prompt at safe points.
- Required updates should block new risky mutations while preserving current work.
- API contract incompatibility should block mutation or switch to read-only.
- Chunk failure should show controlled recovery, not the normal update toast.

## UI Anchors

- `UpdateToast` in `src/components/UpdateSurfaces.tsx`
- `UpdateBanner` in `src/components/UpdateSurfaces.tsx`
- `RequiredUpdateGate` in `src/components/UpdateSurfaces.tsx`
- `ReadonlyModeBanner` in `src/components/UpdateSurfaces.tsx`
