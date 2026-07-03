import { Link, Outlet, createBrowserRouter, useLocation } from "react-router-dom";
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

export function createReactRouter() {
  return createBrowserRouter(
    [
      {
        path: "/",
        element: <Root />,
        errorElement: <ErrorElement />,
        children: [
          { index: true, element: <DashboardPage routerMode="react-router" /> },
          { path: "examples", element: <SimpleExamplesPage routerMode="react-router" /> },
          {
            path: "payments/create/review",
            lazy: reactRouterLazy("payment-review", "payment", () => import("../pages/PaymentReviewRoute")),
            errorElement: <ErrorElement routeId="payment-review" />
          },
          {
            path: "payments/create/:step?",
            lazy: reactRouterLazy("payment-flow", "payment", () => import("../pages/PaymentRoute")),
            errorElement: <ErrorElement routeId="payment-flow" />
          },
          {
            path: "invoices",
            element: (
              <InvoicesPage
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
            path: "invoices/:invoiceId",
            lazy: reactRouterLazy("invoice-detail", "invoice", () => import("../pages/InvoiceDetailRoute")),
            errorElement: <ErrorElement routeId="invoice-detail" />
          },
          {
            path: "cards",
            element: (
              <CardsPage
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
            path: "cards/:cardId",
            lazy: reactRouterLazy("card-detail", "card", () => import("../pages/CardDetailRoute")),
            errorElement: <ErrorElement routeId="card-detail" />
          },
          {
            path: "kyb/review",
            lazy: reactRouterLazy("kyb-review", "kyb", () => import("../pages/KybReviewRoute")),
            errorElement: <ErrorElement routeId="kyb-review" />
          },
          {
            path: "kyb/:step?",
            lazy: reactRouterLazy("kyb-flow", "kyb", () => import("../pages/KybRoute")),
            errorElement: <ErrorElement routeId="kyb-flow" />
          },
          {
            path: "transactions",
            element: (
              <TransactionsPage
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
            path: "transactions/report",
            lazy: reactRouterLazy("transaction-report", "transaction", () => import("../pages/TransactionReportRoute")),
            errorElement: <ErrorElement routeId="transaction-report" />
          },
          { path: "settings", element: <SettingsPage routerMode="react-router" /> },
          { path: "audit", element: <AuditLogPage routerMode="react-router" /> },
          { path: "debug/version-skew", element: <VersionSkewDebugPage routerMode="react-router" /> }
        ]
      }
    ],
    { basename: appBasePath() || undefined }
  );
}
