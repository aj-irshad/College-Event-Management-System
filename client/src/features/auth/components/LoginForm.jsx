import { useState } from "react";
import { Link } from "react-router-dom";

const LoginForm = ({ formData, handleChange, handleSubmit, Eye, EyeOff }) => {
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <form onSubmit={handleSubmit} className="loginForm">
      <section className="heading">
        <h1>Login to your account</h1>
        <p>Enter your credentials to access your account</p>
      </section>
      <section className="loginEmail formGrp">
        <label htmlFor="loginEmail">Email</label>
        <input
          autoFocus
          type="email"
          name="email"
          id="loginEmail"
          value={formData.email}
          onChange={handleChange}
          required
          placeholder="Enter your email"
        />
      </section>

      <section className="loginPassword formGrp">
        <label htmlFor="loginPassword">Password</label>
        <div className="passwordInputWrapper">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            id="loginPassword"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter your password"
            required
          />
          <button
            type="button"
            className="passwordToggleBtn"
            onClick={togglePasswordVisibility}
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>
      </section>
      <button className="loginBtn">Login</button>

      <p className="linktoSignup">
        Don't have an account? <Link to="/signup">Signup</Link>
      </p>
    </form>
  );
};

export default LoginForm;
