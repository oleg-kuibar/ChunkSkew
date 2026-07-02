# Example Index

Examples connect the reusable patterns to product workflows.

- Simple examples workbench: open `/examples?debug=1` for the smallest release identity, chunk recovery, safe refresh, idempotency, update gate, and asset strategy examples.
- Guided cards reset automatically, open the prepared workflow, and expose **Return to example** after you visit Lab controls.
- Simple source: [`../../src/examples/simpleVersionSkewPatterns.ts`](../../src/examples/simpleVersionSkewPatterns.ts) keeps the copy-paste patterns runnable and covered by `tests/simple-patterns.spec.ts`.
- [Payment Safe Refresh](payment-safe-refresh.md): required update, autosaved payment, idempotency key, safe refresh.
- [KYB Draft Recovery](kyb-draft-recovery.md): draft schema compatibility and review-required fallback.
- [Router Chunk Failure](router-chunk-failure.md): React Router and TanStack Router lazy boundary failure/recovery.
- Asset strategy guided setup: use the **Asset strategy** card on `/examples?debug=1` to open a retained-assets transaction report proof.

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

Use guided setup cards for normal retests; they reset automatically before opening the prepared workflow. Click **Reset simulation state** only when replaying a manual path or clearing the whole lab.
