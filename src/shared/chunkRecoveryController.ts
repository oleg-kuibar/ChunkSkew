import { recordAuditEvent } from "./auditLogClient";
import { classifyChunkError } from "./chunkErrorClassifier";
import { readSessionFlag, writeSessionFlag } from "./storage";
import { trackTelemetry } from "./telemetry";
import type { RouterMode, WorkflowType } from "./types";

export interface ChunkRecoveryContext {
  routeId: string;
  routerMode: RouterMode;
  workflowType: WorkflowType;
  currentPath: string;
  mutationIntent?: string;
  idempotencyKeyPresent?: boolean;
}

export interface ChunkRecoveryResult {
  classification: ReturnType<typeof classifyChunkError>;
  attemptCount: number;
  reloaded: boolean;
  loopPrevented: boolean;
}

export interface ChunkFailureEventDetail {
  context: ChunkRecoveryContext;
  classification: ReturnType<typeof classifyChunkError>;
  attemptCount: number;
}

function attemptKey(context: ChunkRecoveryContext) {
  return `chunk-recovery:${context.routerMode}:${context.routeId}:${context.currentPath}`;
}

export async function handleChunkFailure(error: unknown, context: ChunkRecoveryContext): Promise<ChunkRecoveryResult> {
  const classification = classifyChunkError(error);
  const key = attemptKey(context);
  const attemptCount = Number(readSessionFlag(key) ?? "0") + 1;
  writeSessionFlag(key, String(attemptCount));
  window.dispatchEvent(
    new CustomEvent<ChunkFailureEventDetail>("chunk-skew-chunk-failure", {
      detail: { context, classification, attemptCount }
    })
  );

  trackTelemetry(
    context.routerMode === "tanstack-router" ? "tanstack_lazy_route_failed" : "react_router_lazy_route_failed",
    context.routerMode,
    {
      routeId: context.routeId,
      attemptCount,
      assetUrl: classification.assetUrl,
      idempotencyKeyPresent: context.idempotencyKeyPresent
    },
    context.workflowType
  );
  trackTelemetry("chunk_load_failed", context.routerMode, { routeId: context.routeId, attemptCount }, context.workflowType);
  await recordAuditEvent(context.routerMode, "chunk_load.failed", `Lazy chunk failed for ${context.routeId}.`, {
    routeId: context.routeId,
    attemptCount,
    assetUrl: classification.assetUrl,
    workflowType: context.workflowType,
    mutationIntent: context.mutationIntent,
    idempotencyKeyPresent: context.idempotencyKeyPresent
  });

  if (attemptCount === 1 && !window.__CHUNK_SKEW_TEST_NO_RELOAD__) {
    trackTelemetry("chunk_reload_attempted", context.routerMode, { routeId: context.routeId }, context.workflowType);
    await recordAuditEvent(context.routerMode, "chunk_reload.attempted", "The app attempted one safe reload after a chunk failure.", {
      routeId: context.routeId
    });
    window.setTimeout(() => window.location.reload(), 150);
    return { classification, attemptCount, reloaded: true, loopPrevented: false };
  }

  trackTelemetry("chunk_reload_loop_prevented", context.routerMode, { routeId: context.routeId, attemptCount }, context.workflowType);
  await recordAuditEvent(context.routerMode, "chunk_reload.loop_prevented", "Repeated reload was prevented after a chunk failure.", {
    routeId: context.routeId,
    attemptCount
  });
  return { classification, attemptCount, reloaded: false, loopPrevented: true };
}

export function registerVitePreloadErrorHandler(routerMode: RouterMode) {
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    const error = (event as unknown as { payload?: unknown }).payload ?? event;
    void handleChunkFailure(error, {
      routeId: "vite-module-preload",
      routerMode,
      workflowType: "none",
      currentPath: window.location.pathname
    });
  });
}
