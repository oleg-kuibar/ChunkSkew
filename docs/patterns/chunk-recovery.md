# Pattern: Chunk Recovery

Chunk recovery catches lazy import failures, records what happened, attempts one safe reload when allowed, and prevents infinite reload loops.

## Problem

When old chunks are gone, lazy imports can reject with browser- and bundler-specific messages. Without classification and recovery, users see a blank page or generic error boundary.

## Detection

The classifier recognizes patterns such as:

- `Failed to fetch dynamically imported module`
- `Importing a module script failed`
- `ChunkLoadError`
- `Loading chunk`
- `vite:preloadError`
- Missing CSS/JS chunk URLs.

Code anchor:

- `classifyChunkError(error)` in `src/shared/chunkErrorClassifier.ts`

## Recovery Flow

1. Classify the error.
2. Count attempts per route/router/workflow in session storage.
3. Emit `chunk-skew-chunk-failure`.
4. Track router-specific telemetry.
5. Record audit event.
6. On first failure, attempt one reload unless test mode disables reload.
7. On repeat failure, prevent loop and show fallback.

Code anchor:

- `handleChunkFailure(error, context)` in `src/shared/chunkRecoveryController.ts`

## User-Facing Fallback

The fallback should say:

- Progress was saved when autosave was active.
- Refresh is needed to continue safely.
- Sensitive actions will not be submitted twice.

UI anchor:

- `ChunkFailureFallback` in `src/components/UpdateSurfaces.tsx`

## Anti-Patterns

- Infinite reload loops.
- Raw stack traces for normal users.
- Treating every error as version skew.
- Losing idempotency keys before retry.
- Reloading during a pending mutation.
