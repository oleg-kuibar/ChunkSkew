# Example Index

Examples connect the reusable patterns to small interactive checks.

- Simple examples workbench: open `/examples?debug=1` for three plain examples: see old tab, save text, and block submit.
- Guided controls reset automatically, open one prepared route, and expose **Return to example** after you visit Lab controls.
- Simple source: [`../../src/examples/simpleVersionSkewPatterns.ts`](../../src/examples/simpleVersionSkewPatterns.ts) keeps copy-paste patterns runnable; `tests/simple-patterns.spec.ts` checks the minimal source and docs vocabulary, while `tests/update-policy.spec.ts` checks policy decisions.
- [Save Text Safely](save-text-safe-refresh.md): required update, autosaved text, idempotency key, safe refresh.
- [Old Draft](old-draft-recovery.md): draft schema compatibility and check fallback.
- [Router Chunk Failure](router-chunk-failure.md): React Router and TanStack Router lazy boundary failure/recovery.
- Retained-file setup: open `/debug/version-skew?debug=1&scenario=asset-strategy` and click **Start**.

## Run Examples

Start the app:

```bash
pnpm dev:full
```

Open:

```text
http://localhost:5173/examples?debug=1
http://localhost:5173/debug/version-skew?debug=1
```

Use the topbar router switch to replay the current route in React Router or TanStack Router mode.

Use guided setup controls for normal retests; they reset automatically before opening the prepared route. Click **Reset simulation state** only when replaying a manual path or clearing the whole lab.
