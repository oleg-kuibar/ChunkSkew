import { useNavigate } from "@tanstack/react-router";
import { KybWorkflow, type KybStep } from "../../workflows/KybWorkflow";

export function TanStackKybPage({ step }: { step: string }) {
  const navigate = useNavigate();
  return (
    <KybWorkflow
      routerMode="tanstack-router"
      step={(step ?? "business") as KybStep}
      navigateStep={(next) => {
        void navigate({ to: "/kyb/$step", params: { step: next } });
      }}
    />
  );
}
