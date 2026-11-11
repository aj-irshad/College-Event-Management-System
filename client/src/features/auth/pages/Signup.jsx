import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signUp } from "../../../services/authService";
import { UsersRound, Eye, EyeOff } from "lucide-react";
import SignupForm from "../components/SignupForm";
import "../styles/signup.css";
import "../auth.css";

function Signup() {
  const navigate = useNavigate();
  const [warning, setWarning] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
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
    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submittingRef.current) return;

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

    try {
      const response = await signUp(signupData);
      const result = response.data || {};
      const email = result.email || formData.email.trim().toLowerCase();
      const resendAvailableAt = Date.now() + (Number(result.resendAfterSeconds) || 60) * 1000;
      const verificationSession = {
        email,
        signupToken: result.signupToken || "",
        resendAvailableAt,
        deliveryStatus: result.deliveryStatus || "queued",
      };
      try {
        sessionStorage.setItem("ems.signup.session", JSON.stringify(verificationSession));
      } catch {
        // Route state still supports verification for this visit.
      }
      navigate("/verify-otp", {
        state: verificationSession,
      });
    } catch (error) {
      console.warn("Signup request failed:", {
        status: error.response?.status || null,
        requestId: error.response?.headers?.["x-request-id"] || null,
      });
      setWarning(error.response?.data?.message || "Something went wrong.");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <main className="SignupPage">
      <div className="SignupMain">
        {/* Left Side: Brand/Welcome Banner */}
        <section className="welcome">
          <UsersRound className="signupUserIcon" />
          <h1>Join Our Campus</h1>
          <p>Create an account to access events, blogs, and community polls.</p>
        </section>

        {/* Right Side: Form */}
        <SignupForm
          warning={warning}
          formData={formData}
          handleChange={handleChange}
          handleSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          Eye={Eye}
          EyeOff={EyeOff}
        />
      </div>
    </main>
  );
}

export default Signup;
