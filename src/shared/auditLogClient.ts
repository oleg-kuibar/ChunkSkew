import { apiFetch } from "./apiClient";
import { redactSensitiveMetadata } from "./privacy";
import { isStaticDemoHost } from "./staticDemo";
import { trackTelemetry } from "./telemetry";
import type { AuditEvent, RouterMode, WorkflowType } from "./types";

export async function recordAuditEvent(
  routerMode: RouterMode,
  type: string,
  message: string,
  metadata: Record<string, unknown> = {},
  workflowType: WorkflowType = "none"
) {
  const safeMetadata = redactSensitiveMetadata(metadata) as Record<string, unknown>;
  trackTelemetry(type.includes("chunk") ? "chunk_load_failed" : "version_check_succeeded", routerMode, { type, ...safeMetadata }, workflowType);
  if (isStaticDemoHost()) {
    return;
  }
  try {
    await apiFetch<AuditEvent>("/api/audit-events", routerMode, {
      method: "POST",
      body: JSON.stringify({ type, message, metadata: safeMetadata })
    });
  } catch (error) {
    console.warn("Unable to record audit event", error);
  }
}

export async function fetchAuditEvents(routerMode: RouterMode) {
  if (isStaticDemoHost()) {
    return [];
  }
  return apiFetch<AuditEvent[]>("/api/audit-events", routerMode);
}
