# Telemetry And Audit Events

Telemetry explains how often build version skew happens. Audit events explain what happened during sensitive workflows.

## Important Telemetry Events

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
- `payment_submit_started`
- `payment_submit_succeeded`
- `payment_submit_deduped`
- `payment_submit_blocked_required_update`
- `invoice_approval_blocked_required_update`
- `card_update_blocked_required_update`
- `kyb_submit_blocked_required_update`
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

The debug UI can copy telemetry as JSON from the release debug panel.

## Privacy Rule

Do not log full account numbers, card numbers, document contents, secrets, or fake sensitive-looking values beyond what is needed to teach the pattern.
