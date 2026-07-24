import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signUp } from "../../services/authService";
import "./signup.css";
import SignupForm from "./SignupForm";
import { UsersRound } from "lucide-react";

function Signup() {
  const navigate = useNavigate();

  const [warning, setWarning] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    image: null,
  });

  function handleChange(e) {
    const { name, value, files } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setWarning("Passwords do not match");
      return;
    }

    setWarning("");

    // Create multipart/form-data
    const signupData = new FormData();

    signupData.append("name", formData.name);
    signupData.append("email", formData.email);
    signupData.append("password", formData.password);

    // Only append image if one is selected
    if (formData.image) {
      signupData.append("profile-img", formData.image);
    }

    try {
      await signUp(signupData);

      alert("OTP has been sent to your email.");

      navigate("/verify-otp", {
        state: {
          email: formData.email,
        },
      });
    } catch (error) {
      console.error(error);

      setWarning(error.response?.data?.message || "Something went wrong.");
    }
  }

  return (
    <main className="Signup">
      <section className="creaeAccount">
        <UsersRound className="signupUserIcon" />
        <h1>Create Account</h1>
        <p>Join our campus community and get started</p>
      </section>

      <SignupForm
        warning={warning}
        setWarning={setWarning}
        formData={formData}
        setFormData={setFormData}
        handleChange={handleChange}
        handleSubmit={handleSubmit}
      />
    </main>
  );
}

export default Signup;
