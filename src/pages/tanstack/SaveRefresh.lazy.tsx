import { createLazyRoute, useNavigate } from "@tanstack/react-router";
import { ChunkFailureFallback } from "../../components/UpdateSurfaces";
import { SaveRefreshWorkflow, type SaveRefreshStep } from "../../workflows/SaveRefreshWorkflow";

export const DraftRoute = createLazyRoute("/draft/$step")({
  component: TanStackDraftPage,
  pendingComponent: () => <div className="loading-panel">Loading draft...</div>,
  errorComponent: ({ error }) => (
    <ChunkFailureFallback error={error} routerMode="tanstack-router" workflowType="draft" routeId="tanstack-draft-route" />
  )
});

function TanStackDraftPage() {
  const params = DraftRoute.useParams();
  const navigate = useNavigate();
  const step = (params.step ?? "write") as SaveRefreshStep;
  return (
    <SaveRefreshWorkflow
      routerMode="tanstack-router"
      routeBase="/draft"
      step={step}
      navigateStep={(next) => {
        void navigate({ to: "/draft/$step", params: { step: next } });
      }}
    />
  );
}
