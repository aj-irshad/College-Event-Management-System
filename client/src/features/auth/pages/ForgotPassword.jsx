import { useState } from "react";
import { Link } from "react-router-dom";
import { GraduationCap } from "lucide-react";
import { requestPasswordReset } from "../../../services/authService";
import "../auth.css";
import "../styles/login.css";
import "../styles/passwordRecovery.css";

const NEUTRAL_MESSAGE =
  "If an account exists with this email address, password reset instructions will be sent.";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setMessage("");
    setError("");
    try {
      await requestPasswordReset(email.trim());
      setMessage(NEUTRAL_MESSAGE);
    } catch {
      setError("We could not process the request. Please try again shortly.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="LoginMain passwordRecoveryMain">
      <section className="welcome">
        <GraduationCap className="graduationCap" />
        <h1>Account recovery</h1>
        <p>Get a secure link to choose a new password.</p>
      </section>
      <form className="loginForm" onSubmit={handleSubmit}>
        <section className="heading">
          <h1>Forgot password?</h1>
          <p>Enter the email address registered to your EMS account.</p>
        </section>
        <section className="formGrp">
          <label htmlFor="recovery-email">Email</label>
          <input
            id="recovery-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            maxLength={254}
            placeholder="Enter your email"
            disabled={loading}
          />
        </section>
        {message && <p className="recoveryMessage" role="status">{message}</p>}
        {error && <p className="recoveryError" role="alert">{error}</p>}
        <button className="loginBtn" type="submit" disabled={loading}>
          {loading ? "Sending…" : "Send reset instructions"}
        </button>
        <p className="recoveryBackLink"><Link to="/login">Back to Login</Link></p>
      </form>
    </main>
  );
};

export default ForgotPassword;
