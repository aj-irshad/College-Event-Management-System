import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { resendOTP, verifyOTP } from "../../../services/authService";
import VerifyOTPForm from "../components/VerifyOTPForm";
import { MailCheck } from "lucide-react";
import "../styles/VerifyOTP.css";

const SESSION_KEY = "ems.signup.session";

const readStoredEmail = () => {
  try {
    const stored = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    return typeof stored?.email === "string" ? stored.email : "";
  } catch {
    return "";
  }
};

function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email] = useState(() => location.state?.email || readStoredEmail());
  const [otp, setOtp] = useState("");
  const [warning, setWarning] = useState("");
  const [info, setInfo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const submittingRef = useRef(false);
  const resendingRef = useRef(false);

  useEffect(() => {
    if (!email) {
      navigate("/signup", { replace: true });
      return;
    }
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ email }));
    } catch {
      // Route state remains usable for the current visit.
    }
  }, [email, navigate]);

  if (!email) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (submittingRef.current || resendingRef.current) return;
    if (!/^\d{4}$/.test(otp)) {
      setWarning("Enter the 4-digit verification code.");
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setWarning("");
    setInfo("");
    try {
      const response = await verifyOTP({ email, otp });
      try {
        sessionStorage.removeItem(SESSION_KEY);
      } catch {
        // Account creation succeeded; storage cleanup is best-effort.
      }
      navigate("/login", { state: { message: response.data?.message } });
    } catch (error) {
      setWarning(error.response?.data?.message || "Verification failed. Please try again.");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (resendingRef.current || submittingRef.current) return;
    resendingRef.current = true;
    setIsResending(true);
    setWarning("");
    setInfo("");
    try {
      const response = await resendOTP({ email });
      setInfo(response.data?.message || "Verification email sent. Check your inbox.");
    } catch (error) {
      setWarning(error.response?.data?.message || "Could not resend the verification email.");
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
        <p>Enter the secure code sent to your inbox</p>
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
        handleResend={handleResend}
      />
    </main>
  );
}

export default VerifyOTP;
