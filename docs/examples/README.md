# Example Index

Examples connect the reusable patterns to product workflows.

- Simple examples workbench: open `/examples?debug=1` for the smallest release identity, chunk recovery, safe refresh, idempotency, update gate, and asset strategy examples.
- Simple source: [`../../src/examples/simpleVersionSkewPatterns.ts`](../../src/examples/simpleVersionSkewPatterns.ts) keeps the copy-paste patterns runnable and covered by `tests/simple-patterns.spec.ts`.
- [Payment Safe Refresh](payment-safe-refresh.md): required update, autosaved payment, idempotency key, safe refresh.
- [KYB Draft Recovery](kyb-draft-recovery.md): draft schema compatibility and review-required fallback.
- [Router Chunk Failure](router-chunk-failure.md): React Router and TanStack Router lazy boundary failure/recovery.

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

Click **Reset simulation state** before replaying each example.
