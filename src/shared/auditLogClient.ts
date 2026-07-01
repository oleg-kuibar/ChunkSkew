import { apiFetch } from "./apiClient";
import { trackTelemetry } from "./telemetry";
import type { AuditEvent, RouterMode, WorkflowType } from "./types";

export async function recordAuditEvent(
  routerMode: RouterMode,
  type: string,
  message: string,
  metadata: Record<string, unknown> = {},
  workflowType: WorkflowType = "none"
) {
  trackTelemetry(type.includes("chunk") ? "chunk_load_failed" : "version_check_succeeded", routerMode, { type, ...metadata }, workflowType);
  try {
    await apiFetch<AuditEvent>("/api/audit-events", routerMode, {
      method: "POST",
      body: JSON.stringify({ type, message, metadata })
    });
  } catch (error) {
    console.warn("Unable to record audit event", error);
  }
}

export async function fetchAuditEvents(routerMode: RouterMode) {
  return apiFetch<AuditEvent[]>("/api/audit-events", routerMode);
}
