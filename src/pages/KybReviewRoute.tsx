import { useNavigate } from "react-router-dom";
import { KybWorkflow } from "../workflows/KybWorkflow";

export function Component() {
  const navigate = useNavigate();
  return <KybWorkflow routerMode="react-router" step="review" navigateStep={(next) => navigate(`/kyb/${next}`)} />;
}
