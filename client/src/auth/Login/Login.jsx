import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Mail, LockKeyhole } from "lucide-react";

import "./login.css";
import LoginForm from "./LoginForm";
import { login } from "../../services/authService";
import authContext from "../../context/authContext";

const Login = () => {
  const navigate = useNavigate();
  const { setUser } = useContext(authContext);

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

    try {
      const response = await login(formData);

      setUser(response.data.user);

      alert("Login Successful");
      navigate("/");
    } catch (error) {
      if (error.response?.status === 404) {
        alert("Account does not exist. Please create an account.");
        navigate("/signup");
      } else if (error.response?.status === 401) {
        alert("Incorrect email or password.");
      } else {
        alert("Something went wrong. Please try again.");
      }

      console.error(error);
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
        formData={formData}
        handleChange={handleChange}
        handleSubmit={handleSubmit}
      />
    </main>
  );
};

export default Login;
