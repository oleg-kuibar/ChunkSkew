import { useNavigate, useParams } from "react-router-dom";
import { PaymentWorkflow, type PaymentStep } from "../workflows/PaymentWorkflow";

export function Component() {
  const params = useParams();
  const navigate = useNavigate();
  const step = (params.step ?? "recipient") as PaymentStep;
  return <PaymentWorkflow routerMode="react-router" step={step} navigateStep={(next) => navigate(`/payments/create/${next}`)} />;
}
