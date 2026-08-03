import { Link } from "react-router-dom";

const SignupForm = ({ warning, formData, handleChange, handleSubmit }) => {
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
          <input
            type="password"
            id="signupPassword"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="8-16 chars (A-z, 0-9, @#)"
            required
          />
        </section>

        <section className="formGrp">
          <label htmlFor="confirmPassword">Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Re-enter password"
            required
          />
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
          >
            <option value="">Select Dept</option>
            <option value="B. Tech in CS & AI">B. Tech in CS & AI</option>
            <option value="B. Tech in IT">B. Tech in IT</option>
            <option value="Civil Engineering">Civil Engineering</option>
            <option value="IT Engineering">IT Engineering</option>
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
