import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { verifyOTP } from "../../services/authService";
import VerifyOTPForm from "./VerifyOTPForm";
import "./verifyOTP.css";

function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();

  const email = location.state?.email;

  const [otp, setOtp] = useState("");
  const [warning, setWarning] = useState("");

  if (!email) {
    navigate("/signup");
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (otp.length !== 4) {
      setWarning("OTP must be 4 digits");
      return;
    }

    try {
      const response = await verifyOTP({
        email,
        otp,
      });

      alert(response.data.message);
      navigate("/login");
    } catch (error) {
      setWarning(error.response?.data?.msg || "Verification failed");
    }
  }

  return (
    <main className="verifyOTP">
      <section className="verifyOTPHeading">
        <h1>Email Verification</h1>

        <p>
          Enter the 4 digit OTP sent to
          <br />
          <strong>{email}</strong>
        </p>
      </section>

      <VerifyOTPForm
        otp={otp}
        setOtp={setOtp}
        warning={warning}
        handleSubmit={handleSubmit}
      />
    </main>
  );
}

export default VerifyOTP;
