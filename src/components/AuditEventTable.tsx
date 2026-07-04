import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { fetchAuditEvents } from "../shared/auditLogClient";
import { redactSensitiveMetadata } from "../shared/privacy";
import { readTelemetryEvents } from "../shared/telemetry";
import { workflowTypeLabels, type RouterMode } from "../shared/types";

const eventLabels: Record<string, string> = {
  asset_retention_expiring_detected: "Retention window expiring",
  asset_retention_used: "Retained file used",
  api_contract_deprecating_detected: "API contract is changing",
  chunk_load_failed: "Chunk load failed",
  deployment_affinity_used: "Sticky tab used",
  draft_submit_blocked_required_update: "Required update blocked submit",
  draft_submit_deduped: "Duplicate submit reused result",
  old_draft_submit_blocked_required_update: "Required update blocked old draft",
  release_rollback_detected: "Release rollback detected",
  workflow_draft_restored: "Draft restored"
};

function eventLabel(type: string) {
  return eventLabels[type] ?? type.replaceAll("_", " ");
}

export function AuditEventTable({ routerMode, includeTelemetry = true }: { routerMode: RouterMode; includeTelemetry?: boolean }) {
  const auditQuery = useQuery({
    queryKey: ["audit-events", routerMode],
    queryFn: () => fetchAuditEvents(routerMode),
    refetchInterval: 10_000
  });
  const telemetry = includeTelemetry ? readTelemetryEvents() : [];
  const rows = [
    ...(auditQuery.data ?? []).map((event) => ({
      id: event.id,
      type: event.type,
      createdAt: event.createdAt,
      message: event.message,
      source: "server",
      metadata: redactSensitiveMetadata(event.metadata)
    })),
    ...telemetry.slice(0, 50).map((event) => ({
      id: event.id,
      type: event.name,
      createdAt: event.createdAt,
      message: `${event.routerMode}${event.workflowType ? ` · ${workflowTypeLabels[event.workflowType]}` : ""}`,
      source: "browser",
      metadata: redactSensitiveMetadata(event.properties)
    }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <section className="table-section">
      <header className="section-header">
        <div>
          <h2>Event trace</h2>
          <p>Masked metadata only.</p>
        </div>
        <button className="button button-light" type="button" onClick={() => navigator.clipboard.writeText(JSON.stringify(rows, null, 2))}>
          <Download aria-hidden="true" />
          Export JSON
        </button>
      </header>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Source</th>
              <th>Event</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{new Date(row.createdAt).toLocaleTimeString()}</td>
                <td>{row.source}</td>
                <td>{eventLabel(row.type)}</td>
                <td>
                  <code>{JSON.stringify(row.metadata)}</code>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4}>No events recorded yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
