import { getCurrentReleaseIdentity } from "./releaseIdentity";
import { redactSensitiveMetadata } from "./privacy";
import { readJson, writeJson } from "./storage";
import type { RouterMode, TelemetryEvent, TelemetryEventName, WorkflowType } from "./types";

const telemetryKey = "telemetry-events";
const emitter = new EventTarget();

function redact(properties: Record<string, unknown>) {
  return redactSensitiveMetadata(properties) as Record<string, unknown>;
}

export function trackTelemetry(
  name: TelemetryEventName,
  routerMode: RouterMode,
  properties: Record<string, unknown> = {},
  workflowType?: WorkflowType
) {
  const release = getCurrentReleaseIdentity(routerMode);
  const event: TelemetryEvent = {
    id: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString(),
    releaseId: release.releaseId,
    routerMode,
    workflowType,
    properties: redact(properties)
  };
  const next = [event, ...readTelemetryEvents()].slice(0, 300);
  writeJson(telemetryKey, next);
  console.info("[chunk-skew telemetry]", name, event.properties);
  emitter.dispatchEvent(new CustomEvent("telemetry", { detail: event }));
  return event;
}

export function readTelemetryEvents() {
  return readJson<TelemetryEvent[]>(telemetryKey, []);
}

export function clearTelemetryEvents() {
  writeJson(telemetryKey, []);
}

export function exportTelemetryJson() {
  return JSON.stringify(readTelemetryEvents(), null, 2);
}

export function subscribeTelemetry(callback: () => void) {
  const handler = () => callback();
  emitter.addEventListener("telemetry", handler);
  window.addEventListener("chunk-skew-storage", handler);
  return () => {
    emitter.removeEventListener("telemetry", handler);
    window.removeEventListener("chunk-skew-storage", handler);
  };
}
