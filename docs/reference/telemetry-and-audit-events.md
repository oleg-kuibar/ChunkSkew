# Event Trace

The app shows a readable event trace so a learner can verify what happened without decoding raw observability jargon.

The raw implementation still stores telemetry-style browser events and server-side audit events. The UI maps the important ones to plain labels such as **Chunk load failed**, **Draft restored**, and **Required update blocked submit**.

## Raw Event Names

- `version_check_started`
- `version_check_succeeded`
- `version_check_failed`
- `release_available_detected`
- `release_required_detected`
- `release_rollback_detected`
- `update_toast_shown`
- `update_banner_shown`
- `update_refresh_clicked`
- `update_refresh_deferred`
- `chunk_load_failed`
- `chunk_reload_attempted`
- `chunk_reload_loop_prevented`
- `workflow_draft_saved`
- `workflow_draft_restored`
- `draft_submit_started`
- `draft_submit_succeeded`
- `draft_submit_deduped`
- `draft_submit_blocked_required_update`
- `old_draft_submit_blocked_required_update`
- `mutation_deferred_due_to_pending_update`
- `route_preload_started`
- `route_preload_succeeded`
- `route_preload_failed`
- `tanstack_lazy_route_failed`
- `react_router_lazy_route_failed`
- `asset_retention_used`
- `deployment_affinity_used`

## Code Anchors

- `src/shared/telemetry.ts`
- `src/shared/auditLogClient.ts`
- `server/skew-server.ts`
- `src/components/AuditEventTable.tsx`

## Export

The debug UI can copy raw event JSON from the release debug panel or the Event trace table.

## Privacy Rule

Do not log full account numbers, draft contents, document contents, secrets, or fake sensitive-looking values beyond what is needed to teach the pattern. Rendered event data must stay redacted.
