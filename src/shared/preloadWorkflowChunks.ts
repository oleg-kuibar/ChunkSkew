import { shouldSimulateChunkFailure } from "./assetRetentionSimulator";
import { createSyntheticChunkError } from "./chunkErrorClassifier";
import { readJson, writeJson } from "./storage";
import { trackTelemetry } from "./telemetry";
import type { PreloadStatus, RouterMode, WorkflowType } from "./types";

type Loader = () => Promise<unknown>;
type PreloadRegistryEntry = {
  workflowType: WorkflowType;
  required: boolean;
  lazyMechanism: PreloadStatus["lazyMechanism"];
  load: Loader;
};

const saveRefreshWorkflow = () => import("../workflows/SaveRefreshWorkflow");
const badDraftRoute = () => import("../pages/BadDraftRoute");
const retainedFileRoute = () => import("../pages/RetainedFileRoute");
const eventDrawer = () => import("../workflows/LazyEventDrawer");

function entry(
  workflowType: WorkflowType,
  lazyMechanism: PreloadStatus["lazyMechanism"],
  load: Loader,
  required = true
): PreloadRegistryEntry {
  return { workflowType, required, lazyMechanism, load };
}

const registry: Record<string, PreloadRegistryEntry> = {
  "draft-write": entry("draft", "component-lazy", saveRefreshWorkflow),
  "draft-check": entry("draft", "react-router-lazy", () => import("../pages/SaveRefreshReviewRoute")),
  "draft-submit": entry("draft", "component-lazy", saveRefreshWorkflow),
  "draft-done": entry("draft", "component-lazy", saveRefreshWorkflow),
  "bad-draft-note": entry("old-draft", "react-router-lazy", badDraftRoute),
  "bad-draft-check": entry("old-draft", "react-router-lazy", () => import("../pages/BadDraftReviewRoute")),
  "bad-draft-done": entry("old-draft", "react-router-lazy", badDraftRoute),
  "retained-file": entry("event", "react-router-lazy", retainedFileRoute, false),
  "event-drawer": entry("event", "component-lazy", eventDrawer, false),
  "tanstack-draft-route": entry("draft", "tanstack-route-lazy", () => import("../pages/tanstack/SaveRefresh.lazy"))
};

const workflowRoutes: Record<WorkflowType, string[]> = {
  draft: [
    "draft-write",
    "draft-check",
    "draft-submit",
    "draft-done",
    "tanstack-draft-route"
  ],
  "old-draft": ["bad-draft-note", "bad-draft-check", "bad-draft-done"],
  event: ["retained-file", "event-drawer"],
  guarded: [],
  extra: [],
  none: []
};

export function readPreloadStatuses() {
  return readJson<PreloadStatus[]>("preload-statuses", []);
}

function updateStatus(route: string, routerMode: RouterMode, status: Omit<PreloadStatus, "releaseId" | "route">) {
  const releaseId = import.meta.env.VITE_RELEASE_ID ?? __APP_RELEASE_ID__ ?? "dev-local";
  const statuses = readPreloadStatuses().filter((item) => !(item.route === route && item.releaseId === releaseId));
  statuses.unshift({ ...status, route, releaseId });
  writeJson("preload-statuses", statuses.slice(0, 50));
  window.dispatchEvent(new CustomEvent("chunk-skew-preload", { detail: { route, routerMode } }));
}

function writePreloadStatus(
  route: string,
  routerMode: RouterMode,
  entry: PreloadRegistryEntry,
  status: PreloadStatus["status"],
  lastPreloadError?: string
) {
  updateStatus(route, routerMode, {
    workflowType: entry.workflowType,
    lazyMechanism: entry.lazyMechanism,
    status,
    lastPreloadError,
    requiredToFinishWorkflow: entry.required
  });
}

async function loadRouteChunk(route: string, routerMode: RouterMode, entry: PreloadRegistryEntry) {
  if (shouldSimulateChunkFailure(route, routerMode)) {
    throw createSyntheticChunkError(route);
  }
  await entry.load();
}

async function preloadRoute(route: string, routerMode: RouterMode) {
  const entry = registry[route];
  if (!entry) {
    return;
  }
  writePreloadStatus(route, routerMode, entry, "started");
  trackTelemetry("route_preload_started", routerMode, { route }, entry.workflowType);
  try {
    await loadRouteChunk(route, routerMode, entry);
    writePreloadStatus(route, routerMode, entry, "succeeded");
    trackTelemetry("route_preload_succeeded", routerMode, { route }, entry.workflowType);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writePreloadStatus(route, routerMode, entry, "failed", message);
    trackTelemetry("route_preload_failed", routerMode, { route, message }, entry.workflowType);
  }
}

export async function preloadWorkflowChunks(workflowType: WorkflowType, routerMode: RouterMode) {
  const routes = workflowRoutes[workflowType];
  await Promise.all(routes.map((route) => preloadRoute(route, routerMode)));
}
