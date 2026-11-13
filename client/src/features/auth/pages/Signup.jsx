import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getOtpDeliveryStatus, resendOTP, signUp } from "../../../services/authService";
import { UsersRound, Eye, EyeOff } from "lucide-react";
import SignupForm from "../components/SignupForm";
import "../styles/signup.css";
import "../auth.css";

const OTP_STATUS_POLL_MS = 2_000;
const OTP_STATUS_TIMEOUT_MS = 2 * 60_000;
const OTP_SENT_MESSAGE_MS = 700;
const SIGNUP_SESSION_KEY = "ems.signup.session";

const wait = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration));

function Signup() {
  const navigate = useNavigate();
  const [warning, setWarning] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupPhase, setSignupPhase] = useState("idle");
  const [pendingVerification, setPendingVerification] = useState(null);
  const [resendSeconds, setResendSeconds] = useState(0);
  const submittingRef = useRef(false);
  const mountedRef = useRef(true);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    department: "",
    semester: "",
    contact: "",
    "profile-img": null,
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (resendSeconds <= 0) return undefined;
    const timer = window.setTimeout(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1_000);
    return () => window.clearTimeout(timer);
  }, [resendSeconds]);

  function handleChange(e) {
    const { name, value, files } = e.target;
    setWarning("");
    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  }

  const pollEmailStatus = async (signupToken) => {
    const deadline = Date.now() + OTP_STATUS_TIMEOUT_MS;
    while (mountedRef.current && Date.now() < deadline) {
      try {
        const response = await getOtpDeliveryStatus({ signupToken });
        if (!mountedRef.current) return { type: "cancelled" };

        const status = response.data?.status;
        setResendSeconds(Math.max(0, Number(response.data?.resendAfterSeconds) || 0));
        if (status === "sent") return { type: "sent" };
        if (status === "failed") return { type: "failed" };
        if (status !== "queued" && status !== "processing") {
          return { type: "unavailable", message: "The signup verification session is no longer available." };
        }
      } catch (error) {
        if (!mountedRef.current) return { type: "cancelled" };
        if ([400, 401, 403, 404, 410].includes(error.response?.status)) {
          return {
            type: "unavailable",
            message: error.response.data?.message || "The signup verification session has expired.",
          };
        }
        // Keep checking through temporary network errors or backend restarts.
      }

      await wait(OTP_STATUS_POLL_MS);
    }

    return mountedRef.current ? { type: "timeout" } : { type: "cancelled" };
  };

  const saveVerificationSession = (session) => {
    try {
      sessionStorage.setItem(SIGNUP_SESSION_KEY, JSON.stringify(session));
    } catch {
      // Route state still supports verification during this visit.
    }
  };

  const continueAfterDelivery = async (session, outcome) => {
    if (!mountedRef.current || outcome.type === "cancelled") return;

    if (outcome.type === "sent") {
      setSignupPhase("sent");
      setWarning("");
      await wait(OTP_SENT_MESSAGE_MS);
      if (mountedRef.current) navigate("/verify-otp", { state: session });
      return;
    }

    setPendingVerification(session);
    if (outcome.type === "failed") {
      setSignupPhase("failed");
      setWarning("The verification email could not be sent after retries. You can safely request another code below.");
      return;
    }
    if (outcome.type === "timeout") {
      setSignupPhase("timeout");
      setWarning("Email delivery is taking longer than expected. Your registration is saved; check the status again before requesting another code.");
      return;
    }

    setSignupPhase("unavailable");
    setWarning(outcome.message || "The verification session is unavailable. Please start signup again.");
    setPendingVerification(null);
    try {
      sessionStorage.removeItem(SIGNUP_SESSION_KEY);
    } catch {
      // A stale browser session must not block a fresh signup.
    }
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (submittingRef.current || pendingVerification) return;

    if (!formData.department) {
      setWarning("Please select a department.");
      return;
    }

    if (!formData.semester) {
      setWarning("Please select your semester.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setWarning("Passwords do not match");
      return;
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()_+\-=[\]{};':"\\|,.<>/?~`])[A-Za-z\d@$!%*?&^#()_+\-=[\]{};':"\\|,.<>/?~`]{8,16}$/;

    if (!passwordRegex.test(formData.password)) {
      setWarning(
        "Password must be 8-16 characters with uppercase, lowercase, number and special character.",
      );
      return;
    }

    setWarning("");
    submittingRef.current = true;
    setIsSubmitting(true);
    setSignupPhase("signing");

    try {
      await wait(0);
      if (!mountedRef.current) return;
      setSignupPhase("validating");
      await wait(0);
      if (!mountedRef.current) return;
      setSignupPhase("creating");

      const signupData = new FormData();
      signupData.append("name", formData.name);
      signupData.append("email", formData.email);
      signupData.append("password", formData.password);
      signupData.append("contact", formData.contact);
      signupData.append("department", formData.department);
      signupData.append("semester", formData.semester);
      if (formData["profile-img"]) {
        signupData.append("profile-img", formData["profile-img"]);
      }

      const response = await signUp(signupData);
      const result = response.data || {};
      const signupToken = result.signupToken;
      if (typeof signupToken !== "string" || !signupToken) {
        throw new Error("The signup was saved, but its verification session could not be confirmed. Please try signing in or contact support.");
      }

      const session = {
        email: result.email || formData.email.trim().toLowerCase(),
        signupToken,
        resendAvailableAt: Date.now() + (Number(result.resendAfterSeconds) || 60) * 1_000,
        deliveryStatus: result.deliveryStatus || "queued",
      };
      saveVerificationSession(session);
      setPendingVerification(session);
      setSignupPhase("sending");
      const outcome = await pollEmailStatus(signupToken);
      await continueAfterDelivery(session, outcome);
    } catch (error) {
      if (!mountedRef.current) return;
      console.warn("Signup request failed:", {
        status: error.response?.status || null,
        requestId: error.response?.headers?.["x-request-id"] || null,
      });
      setSignupPhase("error");
      setWarning(error.response?.data?.message || error.message || "Something went wrong. Please try again.");
    } finally {
      submittingRef.current = false;
      if (mountedRef.current) setIsSubmitting(false);
    }
  }

  async function handleVerificationAction() {
    if (!pendingVerification || submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setWarning("");

    try {
      if (signupPhase === "timeout") {
        setSignupPhase("sending");
        const outcome = await pollEmailStatus(pendingVerification.signupToken);
        await continueAfterDelivery(pendingVerification, outcome);
        return;
      }

      setSignupPhase("sending");
      const response = await resendOTP({ signupToken: pendingVerification.signupToken });
      const nextSession = {
        ...pendingVerification,
        resendAvailableAt: Date.now() + (Number(response.data?.resendAfterSeconds) || 60) * 1_000,
        deliveryStatus: response.data?.deliveryStatus || "queued",
      };
      saveVerificationSession(nextSession);
      setPendingVerification(nextSession);
      const outcome = await pollEmailStatus(nextSession.signupToken);
      await continueAfterDelivery(nextSession, outcome);
    } catch (error) {
      if (!mountedRef.current) return;
      const retrySeconds = Number(error.response?.data?.retryAfterSeconds);
      if (retrySeconds > 0) setResendSeconds(retrySeconds);
      setSignupPhase("failed");
      setWarning(error.response?.data?.message || "Could not request another verification email.");
    } finally {
      submittingRef.current = false;
      if (mountedRef.current) setIsSubmitting(false);
    }
  }

  const phaseMessages = {
    signing: "Signing up...",
    validating: "Validating information...",
    creating: "Creating registration...",
    sending: "Sending verification email...",
    sent: "OTP sent successfully!",
    failed: "Verification email delivery failed.",
    timeout: "Still waiting for email confirmation.",
    unavailable: "Verification session unavailable.",
    error: "Signup could not be confirmed.",
  };
  const statusActionLabel = signupPhase === "timeout"
    ? "Check email status"
    : resendSeconds > 0
      ? `Resend available in ${resendSeconds}s`
      : "Resend verification email";

  return (
    <main className="SignupPage">
      <div className="SignupMain">
        <section className="welcome">
          <UsersRound className="signupUserIcon" />
          <h1>Join Our Campus</h1>
          <p>Create an account to access events, blogs, and community polls.</p>
        </section>

        <SignupForm
          warning={warning}
          formData={formData}
          handleChange={handleChange}
          handleSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitDisabled={Boolean(pendingVerification)}
          submitLabel={isSubmitting ? "Please wait..." : "Sign Up"}
          signupStatus={phaseMessages[signupPhase] || ""}
          signupStatusTone={signupPhase}
          statusActionLabel={statusActionLabel}
          statusActionDisabled={isSubmitting || (resendSeconds > 0 && signupPhase !== "timeout")}
          onStatusAction={handleVerificationAction}
          showStatusAction={Boolean(pendingVerification) && ["failed", "timeout"].includes(signupPhase)}
          Eye={Eye}
          EyeOff={EyeOff}
        />
      </div>
    </main>
  );
}

export default Signup;
