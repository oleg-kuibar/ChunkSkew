import { Link, Outlet, createBrowserRouter, useLocation } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { ChunkFailureFallback } from "../components/UpdateSurfaces";
import { StartPage } from "../pages/StartPage";
import { SimpleExamplesPage } from "../pages/SimpleExamples";
import { EventRowsPage } from "../pages/EventRows";
import { SettingsPage } from "../pages/Settings";
import { AuditLogPage } from "../pages/AuditLogPage";
import { VersionSkewDebugPage } from "../pages/VersionSkewDebug";
import { reactRouterLazy } from "../shared/lazyRoute";
import { appBasePath } from "../shared/routerLinks";

function Root() {
  const location = useLocation();
  const routeKey = `${location.pathname}${location.search}`;

  return (
    <AppShell
      routerMode="react-router"
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

function ErrorElement({ routeId = "react-router-route" }: { routeId?: string }) {
  return <ChunkFailureFallback error={new Error("Route failed to load")} routerMode="react-router" workflowType="none" routeId={routeId} />;
}

const reactRouterChildren = [
          { index: true, element: <StartPage routerMode="react-router" /> },
          { path: "examples", element: <SimpleExamplesPage routerMode="react-router" /> },
          {
            path: "draft/check",
            lazy: reactRouterLazy("draft-check", "draft", () => import("../pages/SaveRefreshReviewRoute")),
            errorElement: <ErrorElement routeId="draft-check" />
          },
          {
            path: "draft/:step?",
            lazy: reactRouterLazy("draft-flow", "draft", () => import("../pages/SaveRefreshRoute")),
            errorElement: <ErrorElement routeId="draft-flow" />
          },
          {
            path: "bad-draft/check",
            lazy: reactRouterLazy("bad-draft-check", "old-draft", () => import("../pages/BadDraftReviewRoute")),
            errorElement: <ErrorElement routeId="bad-draft-check" />
          },
          {
            path: "bad-draft/:step?",
            lazy: reactRouterLazy("bad-draft-flow", "old-draft", () => import("../pages/BadDraftRoute")),
            errorElement: <ErrorElement routeId="bad-draft-flow" />
          },
          {
            path: "event-rows",
            element: (
              <EventRowsPage
                retainedFilePath="/retained-file"
                routerMode="react-router"
                link={(to, children) => (
                  <Link to={to} className="button button-light">
                    {children}
                  </Link>
                )}
              />
            )
          },
          {
            path: "retained-file",
            lazy: reactRouterLazy("retained-file", "event", () => import("../pages/RetainedFileRoute")),
            errorElement: <ErrorElement routeId="retained-file" />
          },
          { path: "guarded-action", element: <SettingsPage routerMode="react-router" /> },
          { path: "event-log", element: <AuditLogPage routerMode="react-router" /> },
          { path: "debug/version-skew", element: <VersionSkewDebugPage routerMode="react-router" /> }
];

export function createReactRouter() {
  return createBrowserRouter(
    [
      {
        path: "/",
        element: <Root />,
        errorElement: <ErrorElement />,
        children: reactRouterChildren
      }
    ],
    { basename: appBasePath() || undefined }
  );
}
