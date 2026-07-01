import { createLazyRoute } from "@tanstack/react-router";
import { ChunkFailureFallback } from "../../components/UpdateSurfaces";
import { TanStackCardDetail } from "./TanStackCardDetail";

export const Route = createLazyRoute("/cards/$cardId")({
  component: () => {
    const params = Route.useParams();
    return <TanStackCardDetail cardId={params.cardId} />;
  },
  errorComponent: ({ error }) => (
    <ChunkFailureFallback error={error} routerMode="tanstack-router" workflowType="card" routeId="tanstack-card-lazy" />
  )
});
