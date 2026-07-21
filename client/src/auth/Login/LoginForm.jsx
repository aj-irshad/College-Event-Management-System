import { Link } from "react-router-dom";
const LoginForm = ({ formData, handleChange, handleSubmit }) => {
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
        <input
          type="password"
          name="password"
          id="loginPassword"
          value={formData.password}
          onChange={handleChange}
          placeholder="Enter your password"
          required
        />
      </section>
      <button className="loginBtn">Login</button>

      <p className="linktoSignup">
        Don't have an account? <Link to="/signup">Signup</Link>
      </p>
    </form>
  );
};

export default LoginForm;
