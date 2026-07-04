import { useNavigate, useParams } from "react-router-dom";
import { SaveRefreshWorkflow, type SaveRefreshStep } from "../workflows/SaveRefreshWorkflow";

export function Component() {
  const params = useParams();
  const navigate = useNavigate();
  const step = (params.step ?? "write") as SaveRefreshStep;
  const routeBase = "/draft";
  return <SaveRefreshWorkflow routerMode="react-router" routeBase={routeBase} step={step} navigateStep={(next) => navigate(`${routeBase}/${next}`)} />;
}
