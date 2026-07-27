import { Link } from "react-router-dom";

const SignupForm = ({ warning, formData, handleChange, handleSubmit }) => {
  return (
    <form
      onSubmit={handleSubmit}
      className="signup-form"
      encType="multipart/form-data"
    >
      <section className="heading">
        <h1>Create your account</h1>
        <p>Fill in the details to create your account</p>
      </section>

      <section className="form-group">
        <label htmlFor="signupName">Full Name</label>
        <input
          type="text"
          id="signupName"
          name="name"
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
          id="signupEmail"
          name="email"
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
          id="signupPassword"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Create a password"
          pattern="^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()_+\-=\[\]{};':&quot;\\|,.<>\/~`])[A-Za-z\d@$!%*?&^#()_+\-=\[\]{};':&quot;\\|,.<>\/~`]{8,16}$"
          title="Password must be 8-16 characters and include at least one uppercase letter, one lowercase letter, one number, and one special character."
          required
        />
      </section>

      <section className="form-group">
        <label htmlFor="confirmPassword">Confirm Password</label>
        <input
          type="password"
          id="confirmPassword"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder="Confirm your password"
          required
        />
      </section>

      <section className="form-group">
        <label htmlFor="contact">Phone:</label>
        <input
          type="tel"
          id="contact"
          name="contact"
          value={formData.contact}
          onChange={handleChange}
          placeholder="98XXXXXX"
          pattern="(98|97)\d{8}"
          title="Enter a valid Nepal phone number starting with 98 or 97."
          required
        />
      </section>

      <section className="form-group">
        <label htmlFor="userDepartment">Department</label>
        <select
          name="department"
          id="userDepartment"
          value={formData.department}
          onChange={handleChange}
        >
          <option value="B. Tech in CS & AI">B. Tech in CS & AI</option>
          <option value="B. Tech in IT">B. Tech in IT</option>
          <option value="Civil Engineering">Civil Engineering</option>
          <option value="IT Engineering">IT Engineering</option>
        </select>
      </section>

      <section className="form-group">
        <label htmlFor="profile-img">Profile Image</label>
        <input
          type="file"
          id="profile-img"
          name="profile-img"
          accept="image/*"
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

      <button type="submit" className="signupBtn">
        Sign Up
      </button>

      <p className="loginLink">
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </form>
  );
};

export default SignupForm;
