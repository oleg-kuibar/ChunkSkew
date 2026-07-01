# Pattern: Autosave And Idempotency

Autosave preserves user intent. Idempotency prevents duplicate side effects.

## Problem

After a safe refresh or chunk failure, the user may retry a sensitive action. Without idempotency, the retry can create a duplicate payment, duplicate approval, duplicate card change, or duplicate KYB submission.

## Autosave Pattern

Store workflow drafts with:

- Workflow type.
- Schema version.
- Release ID.
- Router mode.
- Current path and step.
- Timestamp.
- Form values.
- User ID.
- Organization ID.
- Idempotency key when applicable.
- Mutation intent.
- API compatibility metadata.

Code anchor:

- `saveWorkflowDraft(input)` in `src/shared/workflowDraftStore.ts`
- `restoreWorkflowDraft(id, routerMode)` in `src/shared/workflowDraftStore.ts`

## Idempotency Pattern

Every sensitive mutation should include:

- Idempotency key.
- Client release ID.
- Deployment ID.
- Router mode.
- User ID.
- Organization ID.
- API contract version.
- Mutation intent.
- Mutation-created-at timestamp.

Code anchors:

- `getOrCreateIdempotencyKey(intent, workflowId)` in `src/shared/idempotencyKeyStore.ts`
- `apiFetch(path, routerMode, options)` in `src/shared/apiClient.ts`
- `requireIdempotency(...)` in `server/skew-server.ts`

## Sensitive Mutations

- Create payment.
- Approve invoice.
- Reject invoice.
- Freeze card.
- Unfreeze card.
- Update card limit.
- Submit KYB/KYC.
- Create vendor.
- Change role/permission.
- Generate API key.

## Safety Rules

- Preserve idempotency keys across refresh.
- Do not submit migrated sensitive data without review.
- Do not clear drafts before a mutation has safely completed.
- On duplicate retry, return the previous result instead of creating another record.
