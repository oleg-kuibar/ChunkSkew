import { Link, Outlet, RouterProvider, createLazyRoute, createRootRoute, createRoute, createRouter, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppShell } from "../components/AppShell";
import { ChunkFailureFallback } from "../components/UpdateSurfaces";
import { StartPage } from "../pages/StartPage";
import { SimpleExamplesPage } from "../pages/SimpleExamples";
import { EventRowsPage } from "../pages/EventRows";
import { SettingsPage } from "../pages/Settings";
import { AuditLogPage } from "../pages/AuditLogPage";
import { VersionSkewDebugPage } from "../pages/VersionSkewDebug";
import { TanStackBadDraftPage } from "../pages/tanstack/TanStackBadDraftPage";
import { shouldSimulateChunkFailure } from "../shared/assetRetentionSimulator";
import { createSyntheticChunkError } from "../shared/chunkErrorClassifier";
import { handleChunkFailure } from "../shared/chunkRecoveryController";
import { tanstackLazyImport } from "../shared/lazyRoute";
import { appBasePath, stripAppBasePath } from "../shared/routerLinks";
import type { WorkflowType } from "../shared/types";

function RootComponent() {
  const routeKey = useRouterState({ select: (state) => state.location.href });

  return (
    <AppShell
      routerMode="tanstack-router"
      routeKey={routeKey}
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

const startRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: () => <StartPage routerMode="tanstack-router" />
});

const examplesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/examples",
  component: () => <SimpleExamplesPage routerMode="tanstack-router" />
});

const draftRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/draft/$step",
  pendingComponent: () => <div className="loading-panel">Loading draft...</div>,
  errorComponent: ({ error }) => (
    <ChunkFailureFallback error={error} routerMode="tanstack-router" workflowType="draft" routeId="tanstack-draft-route" />
  )
}).lazy(async () => {
  try {
    return await tanstackLazyImport("tanstack-draft-route", "draft", () =>
      import("../pages/tanstack/SaveRefresh.lazy").then((module) => module.DraftRoute)
    )();
  } catch (error) {
    return createLazyRoute("/draft/$step")({
      component: () => <ChunkFailureFallback error={error} routerMode="tanstack-router" workflowType="draft" routeId="tanstack-draft-route" />
    });
  }
});

const eventRowsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/event-rows",
  component: () => (
    <EventRowsPage
      retainedFilePath="/retained-file"
      routerMode="tanstack-router"
      link={(to, children) => (
        <Link to={to} className="button button-light">
          {children}
        </Link>
      )}
    />
  )
});

const retainedFileRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/retained-file",
  pendingComponent: () => <div className="loading-panel">Loading retained file route...</div>,
  errorComponent: ({ error }) => (
    <ChunkFailureFallback error={error} routerMode="tanstack-router" workflowType="event" routeId="tanstack-retained-file-route" />
  )
}).lazy(async () => {
  try {
    return await tanstackLazyImport("tanstack-retained-file-route", "event", () =>
      import("../pages/tanstack/Report.lazy").then((module) => module.RetainedFileRoute)
    )();
  } catch (error) {
    return createLazyRoute("/retained-file")({
      component: () => <ChunkFailureFallback error={error} routerMode="tanstack-router" workflowType="event" routeId="tanstack-retained-file-route" />
    });
  }
});

const badDraftRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/bad-draft/$step",
  component: () => {
    const params = badDraftRoute.useParams();
    return <TanStackBadDraftPage routeBase="/bad-draft" routeTo="/bad-draft/$step" step={params.step} />;
  },
  errorComponent: ({ error }) => <ChunkFailureFallback error={error} routerMode="tanstack-router" workflowType="old-draft" routeId="tanstack-bad-draft-route" />
});

const guardedActionRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/guarded-action",
  component: () => <SettingsPage routerMode="tanstack-router" />
});

const eventLogRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/event-log",
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
    <ChunkFailureFallback error={error} routerMode="tanstack-router" workflowType="guarded" routeId="tanstack-pending-lazy" />
  )
}).lazy(async () => {
  try {
    return await tanstackLazyImport("tanstack-pending-lazy", "guarded", () =>
      import("../pages/tanstack/Pending.lazy").then((module) => module.Route)
    )();
  } catch (error) {
    return createLazyRoute("/debug/tanstack-pending")({
      component: () => <ChunkFailureFallback error={error} routerMode="tanstack-router" workflowType="guarded" routeId="tanstack-pending-lazy" />
    });
  }
});

const routeTree = rootRoute.addChildren([
  startRoute,
  examplesRoute,
  draftRoute,
  eventRowsRoute,
  retainedFileRoute,
  badDraftRoute,
  guardedActionRoute,
  eventLogRoute,
  debugRoute,
  pendingRoute
]);

export const tanstackRouter = createRouter({ routeTree, basepath: appBasePath() || "/" });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof tanstackRouter;
  }
}

function initialTanStackChunkFailure(pathname: string): { routeId: string; workflowType: WorkflowType } | null {
  if (pathname.startsWith("/draft/")) {
    return { routeId: "tanstack-draft-route", workflowType: "draft" };
  }
  if (pathname === "/retained-file") {
    return { routeId: "tanstack-retained-file-route", workflowType: "event" };
  }
  if (pathname === "/debug/tanstack-pending") {
    return { routeId: "tanstack-pending-lazy", workflowType: "guarded" };
  }
  return null;
}

export function TanStackRouterApp() {
  const initialFailure = initialTanStackChunkFailure(stripAppBasePath(window.location.pathname));
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
