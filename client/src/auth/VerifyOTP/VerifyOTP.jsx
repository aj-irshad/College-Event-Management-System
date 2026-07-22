import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { verifyOTP } from "../../services/authService";
import VerifyOTPForm from "./VerifyOTPForm";
import { MailCheck } from "lucide-react";
import "./verifyOTP.css";

function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email;

  const [otp, setOtp] = useState("");
  const [warning, setWarning] = useState("");

  // Redirect if accessed directly without an email in state
  useEffect(() => {
    if (!email) {
      navigate("/signup");
    }
  }, [email, navigate]);

  if (!email) return null;

  async function handleSubmit(e) {
    e.preventDefault();

    if (otp.length !== 4) {
      setWarning("OTP must be exactly 4 digits");
      return;
    }

    try {
      const response = await verifyOTP({ email, otp });
      alert(response.data.message);
      navigate("/login");
    } catch (error) {
      setWarning(error.response?.data?.msg || "Verification failed");
    }
  }

  return (
    <main className="VerifyMain">
      <section className="verifyBanner">
        <MailCheck className="verifyIcon" />
        <h1>Email Verification</h1>
        <p>We've sent a secure code to your inbox</p>
      </section>

      <VerifyOTPForm
        email={email}
        otp={otp}
        setOtp={setOtp}
        warning={warning}
        handleSubmit={handleSubmit}
      />
    </main>
  );
}

export default VerifyOTP;
