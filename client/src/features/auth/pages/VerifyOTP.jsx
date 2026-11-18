import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { resendOTP, verifyOTP } from "../../../services/authService";
import VerifyOTPForm from "../components/VerifyOTPForm";
import { useNotifications } from "../../../context/NotificationContext.jsx";
import { MailCheck } from "lucide-react";
import "../styles/VerifyOTP.css";

function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();
  const { notify } = useNotifications();

  const email = location.state?.email;

  const [otp, setOtp] = useState("");
  const [warning, setWarning] = useState("");
  const [info, setInfo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendAvailableAt, setResendAvailableAt] = useState(() =>
    Number(location.state?.resendAvailableAt) || null,
  );
  const [resendSecondsLeft, setResendSecondsLeft] = useState(0);
  const submittingRef = useRef(false);
  const resendingRef = useRef(false);

  // Redirect if accessed directly without an email in state
  useEffect(() => {
    if (!email) {
      navigate("/signup");
    }
  }, [email, navigate]);

  useEffect(() => {
    if (!resendAvailableAt) {
      setResendSecondsLeft(0);
      return undefined;
    }
    const updateCountdown = () => {
      setResendSecondsLeft(Math.max(0, Math.ceil((resendAvailableAt - Date.now()) / 1000)));
    };
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [resendAvailableAt]);

  if (!email) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (submittingRef.current || resendingRef.current) return;

    if (otp.length !== 4) {
      setWarning("OTP must be exactly 4 digits");
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const response = await verifyOTP({ email, otp });
      notify("success", response.data.message || "Your account has been verified.");
      navigate("/login");
    } catch (error) {
      setWarning(error.response?.data?.message || error.response?.data?.msg || "Verification failed");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (submittingRef.current || resendingRef.current || resendSecondsLeft > 0) return;
    resendingRef.current = true;
    setIsResending(true);
    setWarning("");
    setInfo("");
    try {
      const response = await resendOTP({ email });
      const cooldownSeconds = Math.max(0, Number(response.data?.resendCooldownSeconds) || 60);
      setResendAvailableAt(Date.now() + cooldownSeconds * 1000);
      setOtp("");
      setInfo(response.data?.message || "A new verification code was sent.");
    } catch (error) {
      setWarning(error.response?.data?.message || "Could not resend the verification email. Please try again.");
    } finally {
      resendingRef.current = false;
      setIsResending(false);
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
        info={info}
        handleSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        isResending={isResending}
        resendSecondsLeft={resendSecondsLeft}
        handleResend={handleResend}
      />
    </main>
  );
}

export default VerifyOTP;
