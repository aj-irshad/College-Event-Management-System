import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const eventId = searchParams.get("event_id");

  useEffect(() => {
    // Verify transaction with backend and register participation
    // For sandbox testing, you can directly show a success message
    setTimeout(() => {
      alert("Payment Successful!");
      navigate("/upcoming-events");
    }, 2000);
  }, [navigate, eventId]);

  return (
    <div style={{ textAlign: "center", padding: "50px" }}>
      <h2>Processing Payment & Registering...</h2>
      <p>Please wait while we confirm your transaction.</p>
    </div>
  );
};

export default PaymentSuccess;
