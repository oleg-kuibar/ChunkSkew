# Example: Router Chunk Failure

This example demonstrates missing lazy route chunks in both router modes.

## React Router

1. Start `pnpm dev:full`.
2. Open `/debug/version-skew?debug=1&router=react`.
3. Click **Start** on the **Missing file** control. The button resets simulation state, switches to broken assets, and opens the lazy check route.
4. Confirm `ChunkFailureFallback` appears.

## TanStack Router

1. Start `pnpm dev:full`.
2. Open `/debug/version-skew?debug=1&router=tanstack`.
3. Click **Start** on the **Missing file** control. The button resets simulation state, switches to broken assets, and opens the lazy check route.
4. Confirm the same controlled recovery pattern appears.

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

See `missing React Router chunk shows controlled fallback` and `TanStack lazy route also recovers from missing chunk` in `tests/version-skew.spec.ts`.
