# Pattern: Router Lazy Boundaries

React Router and TanStack Router need separate lazy-loading recovery patterns.

## Problem

Build version skew often appears at router boundaries because routes, pending components, and detail views are lazy-loaded.

## React Router Pattern

React Router mode uses:

- `createBrowserRouter`.
- Route-level lazy modules.
- `reactRouterLazy(...)` wrappers.
- Route-level error elements.
- Controlled fallback through shared chunk recovery.

Code anchors:

- `src/router/reactRouter.tsx`
- `src/shared/lazyRoute.ts`
- `src/pages/SaveRefreshReviewRoute.tsx`
- `src/pages/BadDraftReviewRoute.tsx`
- `src/pages/RetainedFileRoute.tsx`

## TanStack Router Pattern

TanStack mode uses:

- A separate router shell.
- Code-based `Route.lazy(() => import(...))`.
- `createLazyRoute(...)` modules.
- Pending/error component examples.
- Equivalent chunk failure classification and fallback.

Code anchors:

- `src/router/tanstackRouter.tsx`
- `src/pages/SaveRefreshRoute.tsx`
- `src/pages/VersionSkewDebug.tsx`

## Important Difference

Critical route matching should stay in the non-lazy route tree. Lazy files should hold render-heavy UI, route components, error UI, pending UI, and drawers where appropriate.

## Test Anchors

The E2E suite covers both router styles:

- React Router lazy review failure.
React Router and TanStack missing-chunk recovery are covered by the compact browser regression in `tests/version-skew.spec.ts`.
