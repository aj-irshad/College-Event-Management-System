import { useRef, useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Mail, LockKeyhole, Eye, EyeOff } from "lucide-react";

import "../auth.css";
import "../styles/login.css";
import LoginForm from "../components/LoginForm";
import { login } from "../../../services/authService";
import authContext from "../../../context/authContext";
import { useNotifications } from "../../../context/NotificationContext.jsx";

const Login = () => {
  const navigate = useNavigate();
  const { setUser } = useContext(authContext);
  const { notify } = useNotifications();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const response = await login(formData);

      setUser(response.data.user);

      notify("success", "Login successful.", "Welcome back");
      navigate("/");
    } catch (error) {
      if (error.response?.status === 404) {
        notify("warning", "Account does not exist. Please create an account.");
        navigate("/signup");
      } else if (error.response?.status === 401) {
        notify("error", "Incorrect email or password.");
      } else {
        notify("error", error.response?.data?.message || "Something went wrong. Please try again.");
      }

      console.error(error);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <main className="LoginMain">
      <section className="welcome">
        <GraduationCap className="graduationCap" />
        <h1>Welcome Back!</h1>
        <p>Login to continue...</p>
      </section>

      <LoginForm
        Mail={Mail}
        LockKeyhole={LockKeyhole}
        Eye={Eye}
        EyeOff={EyeOff}
        formData={formData}
        handleChange={handleChange}
        handleSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </main>
  );
};

export default Login;
