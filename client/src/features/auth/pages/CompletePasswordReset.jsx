import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Eye, EyeOff, GraduationCap } from "lucide-react";
import { completePasswordReset } from "../../../services/authService";
import "../auth.css";
import "../styles/login.css";
import "../styles/passwordRecovery.css";

const PASSWORD_RULE =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()_+\-=[\]{};':"\\|,.<>/?~`])[A-Za-z\d@$!%*?&^#()_+\-=[\]{};':"\\|,.<>/?~`]{8,16}$/;

const CompletePasswordReset = () => {
  const { token } = useParams();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading || success) return;
    setError("");

    if (!token) {
      setError("This password reset link is invalid or expired.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    if (!PASSWORD_RULE.test(newPassword)) {
      setError("Use 8–16 characters with uppercase, lowercase, number and special character.");
      return;
    }

    setLoading(true);
    try {
      await completePasswordReset(token, newPassword);
      setSuccess(true);
      setNewPassword("");
      setConfirmPassword("");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Could not reset your password. Please request a new link.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="LoginMain passwordRecoveryMain">
      <section className="welcome">
        <GraduationCap className="graduationCap" />
        <h1>Create a new password</h1>
        <p>Your reset link can be used once.</p>
      </section>
      <form className="loginForm" onSubmit={handleSubmit}>
        <section className="heading">
          <h1>Reset password</h1>
          <p>Choose a strong password for your EMS account.</p>
        </section>

        {success ? (
          <>
            <p className="recoveryMessage" role="status">
              Password reset successful. Please log in with your new password.
            </p>
            <Link className="loginBtn recoveryLoginButton" to="/login">
              Go to Login
            </Link>
          </>
        ) : (
          <>
            <section className="formGrp">
              <label htmlFor="new-password">New password</label>
              <div className="passwordInputWrapper">
                <input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                  minLength={8}
                  maxLength={16}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="passwordToggleBtn"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide new password" : "Show new password"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </section>
            <p className="passwordGuidance">
              8–16 characters, including uppercase and lowercase letters, a number, and a special character.
            </p>
            <section className="formGrp">
              <label htmlFor="confirm-password">Confirm new password</label>
              <div className="passwordInputWrapper">
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  minLength={8}
                  maxLength={16}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="passwordToggleBtn"
                  onClick={() => setShowConfirmPassword((value) => !value)}
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </section>
            {error && <p className="recoveryError" role="alert">{error}</p>}
            <button className="loginBtn" type="submit" disabled={loading}>
              {loading ? "Updating…" : "Reset password"}
            </button>
            <p className="recoveryBackLink"><Link to="/login">Back to Login</Link></p>
          </>
        )}
      </form>
    </main>
  );
};

export default CompletePasswordReset;
