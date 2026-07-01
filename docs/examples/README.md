# Example Index

Examples connect the reusable patterns to product workflows.

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
http://localhost:5173/debug/version-skew?debug=1
```

Click **Reset simulation state** before replaying each example.
