import { useNavigate } from "@tanstack/react-router";
import { BadDraftWorkflow, type BadDraftStep } from "../../workflows/BadDraftWorkflow";

export function TanStackBadDraftPage({
  routeBase = "/bad-draft",
  routeTo = "/bad-draft/$step",
  step
}: {
  routeBase?: "/bad-draft";
  routeTo?: "/bad-draft/$step";
  step: string;
}) {
  const navigate = useNavigate();
  return (
    <BadDraftWorkflow
      routerMode="tanstack-router"
      routeBase={routeBase}
      step={(step ?? "note") as BadDraftStep}
      navigateStep={(next) => {
        void navigate({ to: routeTo, params: { step: next } });
      }}
    />
  );
}
