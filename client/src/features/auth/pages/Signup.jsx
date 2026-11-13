import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { resendOTP, signUp } from "../../../services/authService";
import { UsersRound, Eye, EyeOff } from "lucide-react";
import SignupForm from "../components/SignupForm";
import "../styles/signup.css";
import "../auth.css";

const SIGNUP_SESSION_KEY = "ems.signup.session";

const wait = (duration) => new Promise((resolve) => window.setTimeout(resolve, duration));

const createSignupToken = () => {
  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return window.btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
};

const makeSignupData = (formData, signupToken) => {
  const signupData = new FormData();
  signupData.append("name", formData.name);
  signupData.append("email", formData.email);
  signupData.append("password", formData.password);
  signupData.append("contact", formData.contact);
  signupData.append("department", formData.department);
  signupData.append("semester", formData.semester);
  signupData.append("signupToken", signupToken);
  if (formData["profile-img"]) signupData.append("profile-img", formData["profile-img"]);
  return signupData;
};

function Signup() {
  const navigate = useNavigate();
  const [warning, setWarning] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupPhase, setSignupPhase] = useState("idle");
  const [pendingVerification, setPendingVerification] = useState(null);
  const [resendSeconds, setResendSeconds] = useState(0);
  const submittingRef = useRef(false);
  const mountedRef = useRef(true);
  const activeSignupTokenRef = useRef("");
  const canRetrySignupRef = useRef(false);
  const submittedFormRef = useRef(null);

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
    try {
      const stored = JSON.parse(sessionStorage.getItem(SIGNUP_SESSION_KEY) || "null");
      if (stored?.email && /^[A-Za-z0-9_-]{43}$/.test(stored.signupToken || "")) {
        if (stored.deliveryStatus === "sent") {
          navigate("/verify-otp", { replace: true, state: stored });
          return;
        }
        activeSignupTokenRef.current = stored.signupToken;
        setPendingVerification(stored);
        setSignupPhase("resume");
        setResendSeconds(Math.max(0, Math.ceil(((stored.resendAvailableAt || 0) - Date.now()) / 1000)));
      }
    } catch {
      // A fresh signup can still proceed if browser storage is unavailable.
    }
  }, [navigate]);

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

  const saveVerificationSession = (session) => {
    try {
      sessionStorage.setItem(SIGNUP_SESSION_KEY, JSON.stringify(session));
    } catch {
      // Route state still supports verification during this visit.
    }
  };

  const continueAfterDelivery = async (session) => {
    if (!mountedRef.current) return;
    setSignupPhase("sent");
    setWarning("");
    navigate("/verify-otp", { state: session });
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
    const signupToken = activeSignupTokenRef.current || createSignupToken();
    activeSignupTokenRef.current = signupToken;
    const submittedForm = { ...formData };
    submittedFormRef.current = submittedForm;
    const email = formData.email.trim().toLowerCase();
    const provisionalSession = {
      email,
      signupToken,
      resendAvailableAt: Date.now(),
      deliveryStatus: "sending",
    };

    try {
      await wait(0);
      if (!mountedRef.current) return;
      setSignupPhase("validating");
      await wait(0);
      if (!mountedRef.current) return;
      setSignupPhase("creating");
      await wait(0);
      if (!mountedRef.current) return;
      setSignupPhase("sending");
      saveVerificationSession(provisionalSession);
      const response = await signUp(makeSignupData(submittedForm, signupToken));
      const result = response.data || {};
      if (result.deliveryStatus !== "sent") {
        throw Object.assign(new Error("The verification email was not confirmed as sent."), {
          response: { data: result, status: response.status },
        });
      }

      const session = {
        ...provisionalSession,
        email: result.email || email,
        resendAvailableAt: Date.now() + (Number(result.resendAfterSeconds) || 60) * 1_000,
        deliveryStatus: "sent",
      };
      saveVerificationSession(session);
      setPendingVerification(session);
      canRetrySignupRef.current = false;
      setResendSeconds(Number(result.resendAfterSeconds) || 60);
      await continueAfterDelivery(session);
    } catch (error) {
      if (!mountedRef.current) return;
      console.warn("Signup request failed:", {
        status: error.response?.status || null,
        requestId: error.response?.headers?.["x-request-id"] || null,
      });
      const responseData = error.response?.data || {};
      const hasSession =
        error.response?.status >= 500 ||
        !error.response ||
        Boolean(responseData.signupToken);
      if (hasSession) {
        const retryAfterSeconds = Math.max(0, Number(responseData.resendAfterSeconds || responseData.retryAfterSeconds) || 60);
        const session = {
          ...provisionalSession,
          email: responseData.email || email,
          signupToken: responseData.signupToken || signupToken,
          resendAvailableAt: Date.now() + retryAfterSeconds * 1_000,
          deliveryStatus: responseData.deliveryStatus || "failed",
        };
        activeSignupTokenRef.current = session.signupToken;
        saveVerificationSession(session);
        setPendingVerification(session);
        setResendSeconds(retryAfterSeconds);
        canRetrySignupRef.current = error.response?.status !== 502;
        setSignupPhase(error.response?.status === 502 ? "failed" : "timeout");
      } else {
        try { sessionStorage.removeItem(SIGNUP_SESSION_KEY); } catch { /* best effort */ }
        setSignupPhase("error");
      }
      setWarning(responseData.message || error.message || "Something went wrong. Please try again.");
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
      setSignupPhase("sending");
      const response = canRetrySignupRef.current
        ? await signUp(makeSignupData(submittedFormRef.current || formData, pendingVerification.signupToken))
        : await resendOTP({ signupToken: pendingVerification.signupToken });
      if (response.data?.deliveryStatus !== "sent") {
        throw Object.assign(new Error("The verification email was not confirmed as sent."), {
          response: { data: response.data || {}, status: response.status },
        });
      }
      const nextSession = {
        ...pendingVerification,
        resendAvailableAt: Date.now() + (Number(response.data?.resendAfterSeconds) || 60) * 1_000,
        deliveryStatus: "sent",
      };
      saveVerificationSession(nextSession);
      setPendingVerification(nextSession);
      canRetrySignupRef.current = false;
      setResendSeconds(Number(response.data?.resendAfterSeconds) || 60);
      await continueAfterDelivery(nextSession);
    } catch (error) {
      if (!mountedRef.current) return;
      if (error.response?.status === 404) {
        canRetrySignupRef.current = true;
        setPendingVerification(null);
        try { sessionStorage.removeItem(SIGNUP_SESSION_KEY); } catch { /* best effort */ }
        setSignupPhase("error");
        setWarning("The pending signup was not found. Review your details and submit again to create a verification session.");
        return;
      }
      const retrySeconds = Number(error.response?.data?.retryAfterSeconds);
      const waitSeconds = retrySeconds || Number(error.response?.data?.resendAfterSeconds);
      if (waitSeconds > 0) {
        setResendSeconds(waitSeconds);
        const nextSession = {
          ...pendingVerification,
          resendAvailableAt: Date.now() + waitSeconds * 1_000,
          deliveryStatus: "failed",
        };
        setPendingVerification(nextSession);
        saveVerificationSession(nextSession);
      }
      setSignupPhase(error.response?.status === 502 ? "failed" : "timeout");
      setWarning(error.response?.data?.message || "Could not request another verification email.");
    } finally {
      submittingRef.current = false;
      if (mountedRef.current) setIsSubmitting(false);
    }
  }

  const phaseMessages = {
    signing: "Signing up...",
    validating: "Validating your information...",
    creating: "Creating your registration...",
    sending: "Sending your verification code...",
    sent: "OTP sent successfully!",
    failed: "Verification email delivery failed.",
    timeout: "The signup request needs to be retried.",
    resume: "Your signup session is saved. You can safely retry email delivery.",
    unavailable: "Verification session unavailable.",
    error: "Signup could not be confirmed.",
  };
  const statusActionLabel = resendSeconds > 0
    ? `Retry available in ${resendSeconds}s`
    : canRetrySignupRef.current
      ? "Retry signup and email"
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
          statusActionDisabled={isSubmitting || resendSeconds > 0}
          onStatusAction={handleVerificationAction}
          showStatusAction={Boolean(pendingVerification) && ["failed", "timeout", "resume"].includes(signupPhase)}
          Eye={Eye}
          EyeOff={EyeOff}
        />
      </div>
    </main>
  );
}

export default Signup;
