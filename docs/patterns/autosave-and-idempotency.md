# Pattern: Autosave And Idempotency

Autosave preserves user intent. Idempotency prevents duplicate side effects.

## Problem

After a safe refresh or chunk failure, the user may retry a protected action. Without idempotency, the retry can create a duplicate side effect.

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

## Protected Actions

- Submit a draft.
- Submit the saved-text example.
- Submit a reviewed draft.
- Create a related record.
- Change a role or permission.
- Generate a key example.

## Safety Rules

- Preserve idempotency keys across refresh.
- Do not submit migrated sensitive data without review.
- Do not clear drafts before a mutation has safely completed.
- On duplicate retry, return the previous result instead of creating another record.
