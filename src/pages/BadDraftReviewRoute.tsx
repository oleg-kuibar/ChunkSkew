import { useNavigate } from "react-router-dom";
import { BadDraftWorkflow } from "../workflows/BadDraftWorkflow";

export function Component() {
  const navigate = useNavigate();
  const routeBase = "/bad-draft";
  return <BadDraftWorkflow routerMode="react-router" routeBase={routeBase} step="check" navigateStep={(next) => navigate(`${routeBase}/${next}`)} />;
}
