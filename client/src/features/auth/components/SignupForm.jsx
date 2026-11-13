import { useState } from "react";
import { Link } from "react-router-dom";
import { LoaderCircle } from "lucide-react";

const SignupForm = ({
  warning,
  formData,
  handleChange,
  handleSubmit,
  isSubmitting,
  pendingEmail = "",
  onRetryEmail,
  Eye,
  EyeOff,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <form
      onSubmit={handleSubmit}
      className="signup-form"
      encType="multipart/form-data"
    >
      <section className="heading">
        <h1>Create Account</h1>
        <p>Fill in your details to get started</p>
      </section>

      <div className="formGrid">
        <section className="formGrp">
          <label htmlFor="signupName">Full Name</label>
          <input
            type="text"
            id="signupName"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Enter full name"
            required
          />
        </section>

        <section className="formGrp">
          <label htmlFor="signupEmail">Email</label>
          <input
            type="email"
            id="signupEmail"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Enter email"
            required
          />
        </section>

        <section className="formGrp">
          <label htmlFor="signupPassword">Password</label>
          <div className="passwordInputWrapper">
            <input
              type={showPassword ? "text" : "password"}
              id="signupPassword"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="8-16 chars (A-z, 0-9, @#)"
              required
            />
            <button
              type="button"
              className="passwordToggleBtn"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </section>

        <section className="formGrp">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <div className="passwordInputWrapper">
            <input
              type={showConfirmPassword ? "text" : "password"}
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Re-enter password"
              required
            />
            <button
              type="button"
              className="passwordToggleBtn"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              aria-label={
                showConfirmPassword
                  ? "Hide confirm password"
                  : "Show confirm password"
              }
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </section>

        <section className="formGrp">
          <label htmlFor="contact">Phone</label>
          <input
            type="tel"
            id="contact"
            name="contact"
            value={formData.contact}
            onChange={handleChange}
            placeholder="98XXXXXX"
            pattern="(98|97)\d{8}"
            title="Nepali phone number starting with 98 or 97."
            required
          />
        </section>

        <section className="formGrp">
          <label htmlFor="userDepartment">Department</label>
          <select
            name="department"
            id="userDepartment"
            value={formData.department}
            onChange={handleChange}
            required
          >
            <option value="">Select Dept</option>
            <option value="B. Tech in CS & AI">B. Tech in CS & AI</option>
            <option value="B. Tech in IT">B. Tech in IT</option>
            <option value="Civil Engineering">Civil Engineering</option>
            <option value="IT Engineering">IT Engineering</option>
          </select>
        </section>

        <section className="formGrp">
          <label htmlFor="userSemester">Semester</label>
          <select
            name="semester"
            id="userSemester"
            value={formData.semester}
            onChange={handleChange}
            required
          >
            <option value="">Select semester</option>
            {["I", "II", "III", "IV", "V", "VI", "VII", "VIII"].map((semester) => (
              <option value={semester} key={semester}>{semester}</option>
            ))}
          </select>
        </section>

        <section className="formGrp fullWidth">
          <label htmlFor="profile-img">Profile Image</label>
          <input
            type="file"
            id="profile-img"
            name="profile-img"
            accept="image/*"
            onChange={handleChange}
          />
        </section>
      </div>

      {warning && <p className="warning">{warning}</p>}

      {pendingEmail && (
        <section className="signupStatus" role="status" aria-live="polite">
          <p>A signup is saved for {pendingEmail}. You can safely retry the verification email.</p>
          <button
            type="button"
            className="signupStatusAction"
            onClick={onRetryEmail}
            disabled={isSubmitting}
          >
            {isSubmitting && <LoaderCircle className="signup-spinner" size={16} aria-hidden="true" />}
            {isSubmitting ? "Sending..." : "Resend verification email"}
          </button>
        </section>
      )}

      <button type="submit" className="signupBtn" disabled={isSubmitting || Boolean(pendingEmail)}>
        {isSubmitting && !pendingEmail && <LoaderCircle className="signup-spinner" size={16} aria-hidden="true" />}
        {pendingEmail ? "Signup pending" : isSubmitting ? "Signing up..." : "Sign Up"}
      </button>

      <p className="loginLink">
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </form>
  );
};

export default SignupForm;
