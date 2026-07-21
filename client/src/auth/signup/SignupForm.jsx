import { Link } from "react-router-dom";

const SignupForm = ({ warning, formData, handleChange, handleSubmit }) => {
  return (
    <form onSubmit={handleSubmit} className="signup-form">
      <section className="heading">
        <h1>Create your account</h1>
        <p>Fill in the details to create your account</p>
      </section>
      <section className="form-group">
        <label htmlFor="signupName">Full Name</label>
        <input
          type="text"
          name="name"
          id="signupName"
          value={formData.name}
          onChange={handleChange}
          placeholder="Enter your full name"
          required
        />
      </section>

      <section className="form-group">
        <label htmlFor="signupEmail">Email</label>
        <input
          type="email"
          name="email"
          id="signupEmail"
          value={formData.email}
          onChange={handleChange}
          placeholder="Enter your email"
          required
        />
      </section>

      <section className="form-group">
        <label htmlFor="signupPassword">Password</label>
        <input
          type="password"
          name="password"
          id="signupPassword"
          value={formData.password}
          onChange={handleChange}
          placeholder="Create a password"
          required
        />
      </section>

      <section className="form-group">
        <label htmlFor="confirmPassword">Confirm Password</label>
        <input
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder="Confirm your password"
          required
        />
      </section>

      <section className="form-group">
        <label htmlFor="profileImage">Profile Image</label>
        <input
          type="file"
          id="profileImage"
          name="image"
          onChange={handleChange}
        />
      </section>

      {warning && (
        <p
          className="warning"
          style={{
            color: "red",
            fontSize: "16px",
            margin: "5px",
            padding: "5px",
          }}
        >
          {warning}
        </p>
      )}

      <button className="signupBtn">Sign Up</button>

      <p className="loginLink">
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </form>
  );
};

export default SignupForm;
