# Cognitive Complexity Snapshot

Audit date: July 2, 2026.

This repo uses a small dependency-free TypeScript source scan as a guardrail for the learning POC. It is intentionally simple: exported/named functions are scanned, branch-like tokens are counted, comments and strings are ignored, and generated route output is excluded.

Proof command:

```bash
pnpm test:e2e:windows test tests/cognitive-complexity.spec.ts --project=chromium --reporter=list
```

Flagging rule:

- More than 15 branch-like tokens, or function length greater than 160 lines.
- Generated `routeTree.gen.ts` is excluded.

Known learning tradeoffs:

| Function | Why it remains larger |
| --- | --- |
| `src/shared/updatePolicyEngine.ts:decideUpdatePolicyForState` | The ordered product decision matrix is explicit so readers can copy the rules without chasing indirection. |
| `src/workflows/SaveRefreshWorkflow.tsx:SaveRefreshWorkflow` | Save-refresh is the primary walkthrough, keeping autosave, confirmation, idempotency, and required-update recovery together. |
| `src/workflows/BadDraftWorkflow.tsx:BadDraftWorkflow` | The bad-draft flow keeps migration, incompatible drafts, and submit safety together for one readable example. |
| `src/pages/VersionSkewDebug.tsx:VersionSkewDebugPage` | Lab controls intentionally keep scenario setup, reset, diagnostics, and audit proof in one visible teaching surface. |

Policy:

- New high-complexity functions should be split or added to this list with a specific learning reason.
- Refactoring one of the known tradeoffs below the threshold should remove it from this list and the test allowlist.
