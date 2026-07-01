import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { fetchAuditEvents } from "../shared/auditLogClient";
import { readTelemetryEvents } from "../shared/telemetry";
import type { RouterMode } from "../shared/types";

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
      source: "audit",
      metadata: event.metadata
    })),
    ...telemetry.slice(0, 50).map((event) => ({
      id: event.id,
      type: event.name,
      createdAt: event.createdAt,
      message: `${event.routerMode}${event.workflowType ? ` · ${event.workflowType}` : ""}`,
      source: "telemetry",
      metadata: event.properties
    }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <section className="table-section">
      <header className="section-header">
        <div>
          <h2>Audit and telemetry events</h2>
          <p>Internal simulation log with masked metadata only.</p>
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
              <th>Type</th>
              <th>Message</th>
              <th>Metadata</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{new Date(row.createdAt).toLocaleTimeString()}</td>
                <td>{row.source}</td>
                <td>{row.type}</td>
                <td>{row.message}</td>
                <td>
                  <code>{JSON.stringify(row.metadata)}</code>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5}>No events recorded yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
