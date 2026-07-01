import { PaymentWorkflow } from "../workflows/PaymentWorkflow";
import { useNavigate } from "react-router-dom";

export function Component() {
  const navigate = useNavigate();
  return <PaymentWorkflow routerMode="react-router" step="review" navigateStep={(next) => navigate(`/payments/create/${next}`)} />;
}
