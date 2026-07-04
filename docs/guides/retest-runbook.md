# Retest Runbook

Use this runbook when you want to replay build version skew scenarios from a clean state.

## Start The App

```bash
pnpm dev:full
```

Open:

```text
http://localhost:5173/debug/version-skew?debug=1&router=react
```

## Reset State

From Simple examples, click **Reset or retest** to open Lab controls. Click **Reset simulation state** there when replaying a manual path or clearing the whole lab.

After the reload, the Lab controls page shows a reset confirmation strip; the build stamp should read `Session dev-local` with `in sync` status again unless you prepare another scenario.

Guided example controls reset automatically before they prepare a scenario, so you do not need a separate reset click before pressing **Start**.

The tracked `server/skew-state.json` file is only the seed state. Live mode changes and reset writes go to ignored `.chunk-skew/skew-state.json`, so retesting should not leave a tracked server-state diff.

The reset clears:

- Browser local/session storage for the POC namespace.
- Autosaved drafts.
- Idempotency keys.
- Version state and recovered release overrides.
- Chunk preload status.
- Event log.
- Local skew mode.
- Backend skew mode.
- Backend stored events.
- Backend idempotency records.
- Mutable fake seed data used by the example routes.

Manual fallback:

```js
localStorage.clear()
sessionStorage.clear()
location.href = "/debug/version-skew?debug=1&router=react"
```

## Reproduce Missing Chunk Recovery

1. Click **Start** on the **Missing file** control.
2. The lab resets, switches to `broken` mode, and opens `/draft/check`.
3. The simulated lazy chunk failure should show a controlled fallback.
4. The fallback should say that entered information was saved when autosave was active.
5. The event trace should show **Chunk load failed**.

Manual path:

1. Reset state.
2. Select `broken` or `no-affinity`.
3. Open `/draft/write?debug=1&router=react`.
4. Click **Continue** once to reach the check step.

## Reproduce Save Text With Safe Refresh

1. Click **Start** on the **Save text** control.
2. The lab resets, switches to retained assets, and opens the draft example.
3. Enter text.
4. Click **Continue** twice to reach the submit step.
5. Use **Lab controls** in the guided banner, open **Advanced diagnostics**, then select `broken`.
6. Click **Return to example** in the guided banner, continue back to the submit step if needed, and try to submit the action.
7. Confirm the required update gate appears.
8. Click **Refresh safely**.
9. Confirm the draft example resumes and the text is restored.
10. Confirm the build stamp shows bundle, session, latest, and status separately, for example `Bundle dev-local / Session release-b / Latest release-b / session recovered`.

## Reproduce API Contract Blocking

1. Click **Start** on the **Block submit** control.
2. The lab resets, switches to API-contract-incompatible mode, and opens the protected action step.
3. Attempt the protected action.
4. The policy should block mutation or move the workflow into read-only behavior.

## Reproduce Old Draft

1. Click **Start** on the **Old draft** control.
2. The lab resets, seeds an incompatible draft, and opens the draft check example.
3. The UI should show a check fallback, not crash or submit automatically.

## Verify With Tests

```bash
pnpm exec tsc --noEmit
pnpm test:article
pnpm test:article:windows
pnpm test:learning:windows
pnpm test:e2e:windows
pnpm build
```

The shortest check for the learning path is `pnpm test:article`. Its browser walkthrough lives in `tests/learning-path.spec.ts` and covers the three-example article, save text restore, blocked submit, and always-reachable controls. On Codex/WSL, use `pnpm test:article:windows`. `pnpm test:learning:windows` adds broader contract, privacy, policy, accessibility, and complexity checks. `tests/version-skew.spec.ts` is now a compact browser regression for the core recovery guarantees.
