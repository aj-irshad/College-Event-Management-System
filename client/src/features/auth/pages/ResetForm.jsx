import { Link } from "react-router-dom";

function ResetForm({
  formData,
  checkMatchPassword,
  handleChange,
  handleSubmit,
}) {
  return (
    <form className="resetForm" onSubmit={handleSubmit}>
      <section className="resetPassword formGrp">
        <label htmlFor="oldPassword">Old Password</label>
        <input
          type="password"
          name="oldPassword"
          id="oldPassword"
          value={formData.oldPassword}
          onChange={handleChange}
          placeholder="Enter old password"
          required
        />
      </section>

      <section className="newPassword formGrp">
        <label htmlFor="newPassword">New Password</label>
        <input
          type="password"
          name="newPassword"
          id="newPassword"
          value={formData.newPassword}
          onChange={handleChange}
          placeholder="Enter new password"
          required
        />
      </section>

      <section className="confirmNewPassword formGrp">
        <label htmlFor="confirmNewPassword">Confirm New Password</label>
        <input
          type="password"
          name="confirmNewPassword"
          id="confirmNewPassword"
          value={formData.confirmNewPassword}
          onChange={handleChange}
          placeholder="Enter new password"
          required
        />
      </section>

      {!checkMatchPassword && (
        <p className="warning">* New Password do not matched!</p>
      )}

      <section className="btnSection">
        <button type="submit" className="resetBtn">
          Reset Password
        </button>
        <Link to="/login" className="loginLink">
          Login
        </Link>
      </section>
    </form>
  );
}

export default ResetForm;
