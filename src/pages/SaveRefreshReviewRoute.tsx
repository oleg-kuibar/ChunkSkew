import { SaveRefreshWorkflow } from "../workflows/SaveRefreshWorkflow";
import { useNavigate } from "react-router-dom";

export function Component() {
  const navigate = useNavigate();
  const routeBase = "/draft";
  return <SaveRefreshWorkflow routerMode="react-router" routeBase={routeBase} step="check" navigateStep={(next) => navigate(`${routeBase}/${next}`)} />;
}
