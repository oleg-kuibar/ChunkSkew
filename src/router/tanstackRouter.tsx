import { Link, Outlet, RouterProvider, createLazyRoute, createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "../components/AppShell";
import { ChunkFailureFallback } from "../components/UpdateSurfaces";
import { DashboardPage } from "../pages/Dashboard";
import { SimpleExamplesPage } from "../pages/SimpleExamples";
import { InvoicesPage } from "../pages/Invoices";
import { CardsPage } from "../pages/Cards";
import { TransactionsPage } from "../pages/Transactions";
import { SettingsPage } from "../pages/Settings";
import { AuditLogPage } from "../pages/AuditLogPage";
import { VersionSkewDebugPage } from "../pages/VersionSkewDebug";
import { TanStackKybPage } from "../pages/tanstack/TanStackKybPage";
import { shouldSimulateChunkFailure } from "../shared/assetRetentionSimulator";
import { createSyntheticChunkError } from "../shared/chunkErrorClassifier";
import { handleChunkFailure } from "../shared/chunkRecoveryController";
import { tanstackLazyImport } from "../shared/lazyRoute";
import type { WorkflowType } from "../shared/types";

function RootComponent() {
  return (
    <AppShell
      routerMode="tanstack-router"
      link={({ to, children, className }) => (
        <Link to={to} className={className}>
          {children}
        </Link>
      )}
    >
      <Outlet />
    </AppShell>
  );
}

const rootRoute = createRootRoute({
  component: RootComponent,
  errorComponent: ({ error }) => (
    <ChunkFailureFallback error={error} routerMode="tanstack-router" workflowType="none" routeId="tanstack-root" />
  )
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <DashboardPage routerMode="tanstack-router" />
});

const examplesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/examples",
  component: () => <SimpleExamplesPage routerMode="tanstack-router" />
});

const paymentRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/payments/create/$step",
  pendingComponent: () => <div className="loading-panel">Loading payment route...</div>,
  errorComponent: ({ error }) => (
    <ChunkFailureFallback error={error} routerMode="tanstack-router" workflowType="payment" routeId="tanstack-payment-lazy" />
  )
}).lazy(async () => {
  try {
    return await tanstackLazyImport("tanstack-payment-lazy", "payment", () =>
      import("../pages/tanstack/Payment.lazy").then((module) => module.Route)
    )();
  } catch (error) {
    return createLazyRoute("/payments/create/$step")({
      component: () => <ChunkFailureFallback error={error} routerMode="tanstack-router" workflowType="payment" routeId="tanstack-payment-lazy" />
    });
  }
});

const invoicesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/invoices",
  component: () => (
    <InvoicesPage
      routerMode="tanstack-router"
      link={(to, children) => (
        <Link to={to} className="button button-light">
          {children}
        </Link>
      )}
    />
  )
});

const invoiceDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/invoices/$invoiceId",
  pendingComponent: () => <div className="loading-panel">Loading invoice route...</div>,
  errorComponent: ({ error }) => (
    <ChunkFailureFallback error={error} routerMode="tanstack-router" workflowType="invoice" routeId="tanstack-invoice-lazy" />
  )
}).lazy(async () => {
  try {
    return await tanstackLazyImport("tanstack-invoice-lazy", "invoice", () =>
      import("../pages/tanstack/InvoiceDetail.lazy").then((module) => module.Route)
    )();
  } catch (error) {
    return createLazyRoute("/invoices/$invoiceId")({
      component: () => <ChunkFailureFallback error={error} routerMode="tanstack-router" workflowType="invoice" routeId="tanstack-invoice-lazy" />
    });
  }
});

const cardsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/cards",
  component: () => (
    <CardsPage
      routerMode="tanstack-router"
      link={(to, children) => (
        <Link to={to} className="button button-light">
          {children}
        </Link>
      )}
    />
  )
});

const cardDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/cards/$cardId",
  pendingComponent: () => <div className="loading-panel">Loading card route...</div>,
  errorComponent: ({ error }) => (
    <ChunkFailureFallback error={error} routerMode="tanstack-router" workflowType="card" routeId="tanstack-card-lazy" />
  )
}).lazy(async () => {
  try {
    return await tanstackLazyImport("tanstack-card-lazy", "card", () =>
      import("../pages/tanstack/CardDetail.lazy").then((module) => module.Route)
    )();
  } catch (error) {
    return createLazyRoute("/cards/$cardId")({
      component: () => <ChunkFailureFallback error={error} routerMode="tanstack-router" workflowType="card" routeId="tanstack-card-lazy" />
    });
  }
});

const transactionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/transactions",
  component: () => (
    <TransactionsPage
      routerMode="tanstack-router"
      link={(to, children) => (
        <Link to={to} className="button button-light">
          {children}
        </Link>
      )}
    />
  )
});

const transactionReportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/transactions/report",
  pendingComponent: () => <div className="loading-panel">Loading report route...</div>,
  errorComponent: ({ error }) => (
    <ChunkFailureFallback error={error} routerMode="tanstack-router" workflowType="transaction" routeId="tanstack-report-lazy" />
  )
}).lazy(async () => {
  try {
    return await tanstackLazyImport("tanstack-report-lazy", "transaction", () =>
      import("../pages/tanstack/Report.lazy").then((module) => module.Route)
    )();
  } catch (error) {
    return createLazyRoute("/transactions/report")({
      component: () => <ChunkFailureFallback error={error} routerMode="tanstack-router" workflowType="transaction" routeId="tanstack-report-lazy" />
    });
  }
});

const kybRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/kyb/$step",
  component: () => {
    const params = kybRoute.useParams();
    return <TanStackKybPage step={params.step} />;
  },
  errorComponent: ({ error }) => <ChunkFailureFallback error={error} routerMode="tanstack-router" workflowType="kyb" routeId="tanstack-error-lazy" />
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: () => <SettingsPage routerMode="tanstack-router" />
});

const auditRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/audit",
  component: () => <AuditLogPage routerMode="tanstack-router" />
});

const debugRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/debug/version-skew",
  component: () => <VersionSkewDebugPage routerMode="tanstack-router" />
});

const pendingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/debug/tanstack-pending",
  pendingComponent: () => <div className="loading-panel">Loading TanStack pending route...</div>,
  errorComponent: ({ error }) => (
    <ChunkFailureFallback error={error} routerMode="tanstack-router" workflowType="admin" routeId="tanstack-pending-lazy" />
  )
}).lazy(async () => {
  try {
    return await tanstackLazyImport("tanstack-pending-lazy", "admin", () =>
      import("../pages/tanstack/Pending.lazy").then((module) => module.Route)
    )();
  } catch (error) {
    return createLazyRoute("/debug/tanstack-pending")({
      component: () => <ChunkFailureFallback error={error} routerMode="tanstack-router" workflowType="admin" routeId="tanstack-pending-lazy" />
    });
  }
});

const routeTree = rootRoute.addChildren([
  dashboardRoute,
  examplesRoute,
  paymentRoute,
  invoicesRoute,
  invoiceDetailRoute,
  cardsRoute,
  cardDetailRoute,
  transactionsRoute,
  transactionReportRoute,
  kybRoute,
  settingsRoute,
  auditRoute,
  debugRoute,
  pendingRoute
]);

export const tanstackRouter = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof tanstackRouter;
  }
}

function initialTanStackChunkFailure(pathname: string): { routeId: string; workflowType: WorkflowType } | null {
  if (pathname.startsWith("/payments/create/")) {
    return { routeId: "tanstack-payment-lazy", workflowType: "payment" };
  }
  if (pathname.startsWith("/invoices/")) {
    return { routeId: "tanstack-invoice-lazy", workflowType: "invoice" };
  }
  if (pathname === "/transactions/report") {
    return { routeId: "tanstack-report-lazy", workflowType: "transaction" };
  }
  if (pathname === "/debug/tanstack-pending") {
    return { routeId: "tanstack-pending-lazy", workflowType: "admin" };
  }
  return null;
}

export function TanStackRouterApp() {
  const initialFailure = initialTanStackChunkFailure(window.location.pathname);
  const simulatedFailure =
    initialFailure && shouldSimulateChunkFailure(initialFailure.routeId, "tanstack-router") ? initialFailure : null;
  const simulatedError = simulatedFailure ? createSyntheticChunkError(simulatedFailure.routeId) : null;

  useEffect(() => {
    if (simulatedFailure && simulatedError) {
      void handleChunkFailure(simulatedError, {
        routeId: simulatedFailure.routeId,
        routerMode: "tanstack-router",
        workflowType: simulatedFailure.workflowType,
        currentPath: window.location.pathname
      });
    }
  }, [simulatedError, simulatedFailure]);

  if (simulatedFailure && simulatedError) {
    return (
      <ChunkFailureFallback
        error={simulatedError}
        routerMode="tanstack-router"
        workflowType={simulatedFailure.workflowType}
        routeId={simulatedFailure.routeId}
      />
    );
  }

  return <RouterProvider router={tanstackRouter} />;
}
