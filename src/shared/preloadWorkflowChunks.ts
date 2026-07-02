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

const registry: Record<string, PreloadRegistryEntry> = {
  "payment-recipient": {
    workflowType: "payment",
    required: true,
    lazyMechanism: "component-lazy",
    load: () => import("../workflows/PaymentWorkflow")
  },
  "payment-review": {
    workflowType: "payment",
    required: true,
    lazyMechanism: "react-router-lazy",
    load: () => import("../pages/PaymentReviewRoute")
  },
  "payment-mfa": {
    workflowType: "payment",
    required: true,
    lazyMechanism: "component-lazy",
    load: () => import("../workflows/PaymentWorkflow")
  },
  "invoice-detail": {
    workflowType: "invoice",
    required: true,
    lazyMechanism: "react-router-lazy",
    load: () => import("../pages/InvoiceDetailRoute")
  },
  "card-detail": {
    workflowType: "card",
    required: true,
    lazyMechanism: "react-router-lazy",
    load: () => import("../pages/CardDetailRoute")
  },
  "kyb-review": {
    workflowType: "kyb",
    required: true,
    lazyMechanism: "react-router-lazy",
    load: () => import("../pages/KybReviewRoute")
  },
  "transaction-report": {
    workflowType: "transaction",
    required: false,
    lazyMechanism: "react-router-lazy",
    load: () => import("../pages/TransactionReportRoute")
  },
  "tanstack-payment-lazy": {
    workflowType: "payment",
    required: true,
    lazyMechanism: "tanstack-route-lazy",
    load: () => import("../pages/tanstack/Payment.lazy")
  },
  "tanstack-invoice-lazy": {
    workflowType: "invoice",
    required: true,
    lazyMechanism: "tanstack-route-lazy",
    load: () => import("../pages/tanstack/InvoiceDetail.lazy")
  }
};

const workflowRoutes: Record<WorkflowType, string[]> = {
  payment: ["payment-recipient", "payment-review", "payment-mfa", "tanstack-payment-lazy"],
  invoice: ["invoice-detail", "tanstack-invoice-lazy"],
  card: ["card-detail"],
  kyb: ["kyb-review"],
  transaction: ["transaction-report"],
  admin: [],
  vendor: [],
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
