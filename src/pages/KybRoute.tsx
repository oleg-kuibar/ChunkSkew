import { useNavigate, useParams } from "react-router-dom";
import { KybWorkflow, type KybStep } from "../workflows/KybWorkflow";

export function Component() {
  const params = useParams();
  const navigate = useNavigate();
  const step = (params.step ?? "business") as KybStep;
  return <KybWorkflow routerMode="react-router" step={step} navigateStep={(next) => navigate(`/kyb/${next}`)} />;
}
