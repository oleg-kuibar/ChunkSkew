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

const paymentWorkflow = () => import("../workflows/PaymentWorkflow");
const invoiceDetailRoute = () => import("../pages/InvoiceDetailRoute");
const invoiceApprovalModal = () => import("../workflows/InvoiceApprovalModal");
const cardDetailRoute = () => import("../pages/CardDetailRoute");
const kybRoute = () => import("../pages/KybRoute");
const kybDocumentsStep = () => import("../workflows/KybDocumentsStep");
const transactionReportRoute = () => import("../pages/TransactionReportRoute");
const transactionDrawer = () => import("../workflows/SuspiciousTransactionDrawer");

function entry(
  workflowType: WorkflowType,
  lazyMechanism: PreloadStatus["lazyMechanism"],
  load: Loader,
  required = true
): PreloadRegistryEntry {
  return { workflowType, required, lazyMechanism, load };
}

const registry: Record<string, PreloadRegistryEntry> = {
  "payment-recipient": entry("payment", "component-lazy", paymentWorkflow),
  "payment-amount": entry("payment", "component-lazy", paymentWorkflow),
  "payment-funding-account": entry("payment", "component-lazy", paymentWorkflow),
  "payment-date": entry("payment", "component-lazy", paymentWorkflow),
  "payment-review": entry("payment", "react-router-lazy", () => import("../pages/PaymentReviewRoute")),
  "payment-mfa": entry("payment", "component-lazy", paymentWorkflow),
  "payment-submit": entry("payment", "component-lazy", paymentWorkflow),
  "payment-receipt": entry("payment", "component-lazy", paymentWorkflow),
  "invoice-detail": entry("invoice", "react-router-lazy", invoiceDetailRoute),
  "invoice-approval-modal": entry("invoice", "component-lazy", invoiceApprovalModal),
  "invoice-rejection-modal": entry("invoice", "component-lazy", invoiceApprovalModal),
  "invoice-audit-drawer": entry("invoice", "react-router-lazy", invoiceDetailRoute, false),
  "card-detail": entry("card", "react-router-lazy", cardDetailRoute),
  "card-spend-limit-form": entry("card", "react-router-lazy", cardDetailRoute),
  "card-freeze-confirmation": entry("card", "react-router-lazy", cardDetailRoute),
  "card-merchant-controls": entry("card", "react-router-lazy", cardDetailRoute),
  "kyb-business": entry("kyb", "react-router-lazy", kybRoute),
  "kyb-owners": entry("kyb", "react-router-lazy", kybRoute),
  "kyb-documents": entry("kyb", "component-lazy", kybDocumentsStep),
  "kyb-review": entry("kyb", "react-router-lazy", () => import("../pages/KybReviewRoute")),
  "kyb-submit-result": entry("kyb", "react-router-lazy", kybRoute),
  "transaction-report": entry("transaction", "react-router-lazy", transactionReportRoute, false),
  "transaction-drawer": entry("transaction", "component-lazy", transactionDrawer, false),
  "tanstack-payment-lazy": entry("payment", "tanstack-route-lazy", () => import("../pages/tanstack/Payment.lazy")),
  "tanstack-invoice-lazy": entry("invoice", "tanstack-route-lazy", () => import("../pages/tanstack/InvoiceDetail.lazy"))
};

const workflowRoutes: Record<WorkflowType, string[]> = {
  payment: [
    "payment-recipient",
    "payment-amount",
    "payment-funding-account",
    "payment-date",
    "payment-review",
    "payment-mfa",
    "payment-submit",
    "payment-receipt",
    "tanstack-payment-lazy"
  ],
  invoice: ["invoice-detail", "invoice-approval-modal", "invoice-rejection-modal", "invoice-audit-drawer", "tanstack-invoice-lazy"],
  card: ["card-detail", "card-spend-limit-form", "card-freeze-confirmation", "card-merchant-controls"],
  kyb: ["kyb-business", "kyb-owners", "kyb-documents", "kyb-review", "kyb-submit-result"],
  transaction: ["transaction-report", "transaction-drawer"],
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
