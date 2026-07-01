# Example: Router Chunk Failure

This example demonstrates missing lazy route chunks in both router modes.

## React Router

1. Start `pnpm dev:full`.
2. Open `/debug/version-skew?debug=1&router=react`.
3. Click **Reset simulation state**.
4. Click **Prepare missing chunk fallback**.
5. Confirm `ChunkFailureFallback` appears.

## TanStack Router

1. Start `pnpm dev:full`.
2. Open `/debug/version-skew?debug=1&router=tanstack`.
3. Click **Reset simulation state**.
4. Click **Prepare missing chunk fallback**.
5. Confirm the same controlled recovery pattern appears.

## Expected Behavior

- Route lazy import failure is classified.
- Telemetry records router-specific lazy failure.
- Audit records chunk failure.
- A reload is attempted once when not in test mode.
- Repeat failure shows fallback and prevents reload loop.

## Code Anchors

- `src/router/reactRouter.tsx`
- `src/router/tanstackRouter.tsx`
- `src/shared/lazyRoute.ts`
- `src/shared/chunkErrorClassifier.ts`
- `src/shared/chunkRecoveryController.ts`
- `src/components/UpdateSurfaces.tsx`

## Test Anchors

See these tests in `tests/version-skew.spec.ts`:

- React Router lazy payment review route failure.
- React Router invoice detail lazy failure.
- React Router route error boundary repeated failure.
- TanStack lazy payment route failure.
- Code-based TanStack invoice route failure.
