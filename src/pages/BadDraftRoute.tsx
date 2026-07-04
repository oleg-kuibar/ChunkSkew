import { useNavigate, useParams } from "react-router-dom";
import { BadDraftWorkflow, type BadDraftStep } from "../workflows/BadDraftWorkflow";

export function Component() {
  const params = useParams();
  const navigate = useNavigate();
  const step = (params.step ?? "note") as BadDraftStep;
  const routeBase = "/bad-draft";
  return <BadDraftWorkflow routerMode="react-router" routeBase={routeBase} step={step} navigateStep={(next) => navigate(`${routeBase}/${next}`)} />;
}
