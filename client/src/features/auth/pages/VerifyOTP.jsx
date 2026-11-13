import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  resendOTP,
  verifyOTP,
} from "../../../services/authService";
import VerifyOTPForm from "../components/VerifyOTPForm";
import { MailCheck } from "lucide-react";
import "../styles/VerifyOTP.css";

const SESSION_KEY = "ems.signup.session";

const readStoredSession = () => {
  try {
    const value = sessionStorage.getItem(SESSION_KEY);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const getInitialSession = (routeState) => ({
  ...(readStoredSession() || {}),
  ...(routeState || {}),
});

function VerifyOTP() {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState(() => getInitialSession(location.state));
  const email = session?.email || "";
  const signupToken = session?.signupToken || "";

  const [otp, setOtp] = useState("");
  const [warning, setWarning] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState(() =>
    ["sending", "checking", "unknown"].includes(session?.deliveryStatus)
      ? "failed"
      : (session?.deliveryStatus || "sent"),
  );
  const [resendSeconds, setResendSeconds] = useState(() =>
    Math.max(0, Math.ceil(((session?.resendAvailableAt || 0) - Date.now()) / 1000)),
  );
  const submittingRef = useRef(false);
  const resendingRef = useRef(false);

  useEffect(() => {
    if (!email) navigate("/signup", { replace: true });
  }, [email, navigate]);

  useEffect(() => {
    if (!session || !location.state) return;
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      // The route state remains usable for this visit when session storage is unavailable.
    }
  }, [location.state, session]);

  useEffect(() => {
    if (!session?.resendAvailableAt) return undefined;
    const updateCountdown = () => {
      setResendSeconds(Math.max(0, Math.ceil((session.resendAvailableAt - Date.now()) / 1000)));
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1_000);
    return () => clearInterval(timer);
  }, [session?.resendAvailableAt]);

  if (!email) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (submittingRef.current) return;

    if (otp.length !== 4) {
      setWarning("OTP must be exactly 4 digits");
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setWarning("");
    try {
      const response = await verifyOTP({ email, otp, ...(signupToken ? { signupToken } : {}) });
      try {
        sessionStorage.removeItem(SESSION_KEY);
      } catch {
        // Verification has succeeded; storage cleanup is best-effort.
      }
      navigate("/login", { state: { message: response.data?.message } });
    } catch (error) {
      setWarning(error.response?.data?.message || error.response?.data?.msg || "Verification failed");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (resendingRef.current || resendSeconds > 0) return;
    resendingRef.current = true;
    setIsResending(true);
    setWarning("");
    try {
      const response = await resendOTP({ email, ...(signupToken ? { signupToken } : {}) });
      const nextToken = response.data?.signupToken || signupToken;
      const resendAvailableAt = Date.now() + (Number(response.data?.resendAfterSeconds) || 60) * 1000;
      const nextSession = {
        ...session,
        email,
        signupToken: nextToken,
        resendAvailableAt,
        deliveryStatus: response.data?.deliveryStatus || "sent",
      };
      setSession(nextSession);
      setDeliveryStatus(nextSession.deliveryStatus);
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
      } catch {
        // Current page state remains sufficient to continue verification.
      }
    } catch (error) {
      const retrySeconds = Number(
        error.response?.data?.retryAfterSeconds || error.response?.data?.resendAfterSeconds,
      );
      if (retrySeconds > 0) {
        const nextSession = {
          ...session,
          resendAvailableAt: Date.now() + retrySeconds * 1000,
          deliveryStatus: error.response?.status === 502 ? "failed" : deliveryStatus,
        };
        setSession(nextSession);
        setDeliveryStatus(nextSession.deliveryStatus);
        try {
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
        } catch {
          // The server continues enforcing the cooldown if storage is unavailable.
        }
      }
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
        handleSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        deliveryStatus={deliveryStatus}
        resendSeconds={resendSeconds}
        isResending={isResending}
        handleResend={handleResend}
      />
    </main>
  );
}

export default VerifyOTP;
