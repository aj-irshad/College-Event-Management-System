import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { resendOTP, signUp } from "../../../services/authService";
import { UsersRound, Eye, EyeOff } from "lucide-react";
import SignupForm from "../components/SignupForm";
import "../styles/signup.css";
import "../auth.css";

const SIGNUP_SESSION_KEY = "ems.signup.session";

const readSavedEmail = () => {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SIGNUP_SESSION_KEY) || "null");
    return typeof saved?.email === "string" ? saved.email : "";
  } catch {
    return "";
  }
};

const saveEmail = (email) => {
  try {
    sessionStorage.setItem(SIGNUP_SESSION_KEY, JSON.stringify({ email }));
  } catch {
    // Route state still carries the email for the current visit.
  }
};

const clearSavedEmail = () => {
  try {
    sessionStorage.removeItem(SIGNUP_SESSION_KEY);
  } catch {
    // Storage cleanup is best-effort.
  }
};

const makeSignupData = (formData) => {
  const signupData = new FormData();
  signupData.append("name", formData.name.trim());
  signupData.append("email", formData.email.trim().toLowerCase());
  signupData.append("password", formData.password);
  signupData.append("contact", formData.contact.trim());
  signupData.append("department", formData.department);
  signupData.append("semester", formData.semester);
  if (formData["profile-img"]) signupData.append("profile-img", formData["profile-img"]);
  return signupData;
};

function Signup() {
  const navigate = useNavigate();
  const [warning, setWarning] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingEmail, setPendingEmail] = useState(() => readSavedEmail());
  const submittingRef = useRef(false);

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

  function handleChange(e) {
    const { name, value, files } = e.target;
    setWarning("");
    setFormData((previous) => ({
      ...previous,
      [name]: files ? files[0] : value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submittingRef.current || pendingEmail) return;

    if (!formData.department) {
      setWarning("Please select a department.");
      return;
    }
    if (!formData.semester) {
      setWarning("Please select your semester.");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setWarning("Passwords do not match.");
      return;
    }

    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()_+\-=[\]{};':"\\|,.<>/?~`])[A-Za-z\d@$!%*?&^#()_+\-=[\]{};':"\\|,.<>/?~`]{8,16}$/;
    if (!passwordRegex.test(formData.password)) {
      setWarning("Password must be 8-16 characters with uppercase, lowercase, number and special character.");
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setWarning("");
    const email = formData.email.trim().toLowerCase();
    try {
      const response = await signUp(makeSignupData(formData));
      saveEmail(response.data?.email || email);
      navigate("/verify-otp", { state: { email: response.data?.email || email } });
    } catch (error) {
      const responseData = error.response?.data || {};
      const retryable = responseData.pendingSignup || !error.response || error.response.status >= 500;
      if (retryable) {
        saveEmail(responseData.email || email);
        setPendingEmail(responseData.email || email);
      } else {
        clearSavedEmail();
      }
      setWarning(responseData.message || "Could not complete signup. Please try again.");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  async function handleRetryEmail() {
    if (!pendingEmail || submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setWarning("");
    try {
      const response = await resendOTP({ email: pendingEmail });
      const email = response.data?.email || pendingEmail;
      saveEmail(email);
      navigate("/verify-otp", { state: { email } });
    } catch (error) {
      if ([404, 410].includes(error.response?.status)) {
        clearSavedEmail();
        setPendingEmail("");
        setWarning("No active signup was found. Please enter your details and sign up again.");
      } else {
        setWarning(error.response?.data?.message || "Could not send the verification email. Please try again.");
      }
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

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
          pendingEmail={pendingEmail}
          onRetryEmail={handleRetryEmail}
          Eye={Eye}
          EyeOff={EyeOff}
        />
      </div>
    </main>
  );
}

export default Signup;
