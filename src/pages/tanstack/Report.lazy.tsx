import { createLazyRoute } from "@tanstack/react-router";
import { ChunkFailureFallback } from "../../components/UpdateSurfaces";
import { TanStackTransactionReport } from "./TanStackTransactionReport";

export const Route = createLazyRoute("/transactions/report")({
  component: TanStackTransactionReport,
  errorComponent: ({ error }) => (
    <ChunkFailureFallback error={error} routerMode="tanstack-router" workflowType="transaction" routeId="tanstack-report-lazy" />
  )
});
