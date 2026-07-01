# Pattern: Release Identity

Release identity lets the app compare what is loaded, what the session believes is current, and what the server says is latest.

## Problem

If the UI only says `current release`, debugging recovery is ambiguous. After safe refresh, a session may be marked recovered to release B while the currently loaded dev bundle is still `dev-local` during local testing.

## Pattern

Track separate identities:

- Bundle release: the JavaScript bundle currently loaded by the browser.
- Session release: the release state used by guards and recovery after safe refresh.
- Latest release: the release advertised by `/version.json` or the release bus.

## Code Anchors

- `getBundledReleaseIdentity(routerMode)` in `src/shared/releaseIdentity.ts`
- `getCurrentReleaseIdentity(routerMode)` in `src/shared/releaseIdentity.ts`
- `fetchVersionMetadata(routerMode)` in `src/shared/releaseIdentity.ts`
- `getVersionState(routerMode)` in `src/shared/versionCheckClient.ts`
- `BuildVersionStamp` in `src/components/UpdateSurfaces.tsx`

## UI Rule

Show labels that do not lie:

```text
Bundle dev-local
Bundle dev-local · session release-b
Bundle release-a -> latest release-b
```

Avoid ambiguous labels such as:

```text
release-b current
```

That wording hides whether release B is the actual loaded bundle, the recovered session state, or the server latest.

## Production Notes

- Generate release metadata at build time.
- Serve `/version.json` with `cache-control: no-store`.
- Include release and deployment IDs on API requests.
- Include API contract version and feature flag snapshot version.
- Keep debug detail internal; expose only calm user-facing update copy to normal users.
