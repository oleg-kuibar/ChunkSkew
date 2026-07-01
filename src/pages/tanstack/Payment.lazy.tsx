import { createLazyRoute, useNavigate } from "@tanstack/react-router";
import { ChunkFailureFallback } from "../../components/UpdateSurfaces";
import { PaymentWorkflow, type PaymentStep } from "../../workflows/PaymentWorkflow";

export const Route = createLazyRoute("/payments/create/$step")({
  component: TanStackPaymentPage,
  pendingComponent: () => <div className="loading-panel">Loading payment route...</div>,
  errorComponent: ({ error }) => (
    <ChunkFailureFallback error={error} routerMode="tanstack-router" workflowType="payment" routeId="tanstack-payment-lazy" />
  )
});

function TanStackPaymentPage() {
  const params = Route.useParams();
  const navigate = useNavigate();
  const step = (params.step ?? "recipient") as PaymentStep;
  return (
    <PaymentWorkflow
      routerMode="tanstack-router"
      step={step}
      navigateStep={(next) => {
        void navigate({ to: "/payments/create/$step", params: { step: next } });
      }}
    />
  );
}
