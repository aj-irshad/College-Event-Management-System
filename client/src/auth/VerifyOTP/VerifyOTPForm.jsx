function VerifyOTPForm({ email, otp, setOtp, warning, handleSubmit }) {
  return (
    <form className="verifyForm" onSubmit={handleSubmit}>
      <section className="heading">
        <h2>Enter OTP</h2>
        <p>
          Sent to <strong>{email}</strong>
        </p>
      </section>

      <section className="formGrp otpGroup">
        <label htmlFor="otp">4-Digit Verification Code</label>
        <input
          type="text"
          id="otp"
          placeholder="● ● ● ●"
          maxLength={4}
          value={otp}
          onChange={(e) => {
            // Only allow numbers
            const value = e.target.value.replace(/\D/g, "");
            setOtp(value);
          }}
          required
        />
      </section>

      {warning && <p className="warning">* {warning}</p>}

      <section className="btnSection">
        <button type="submit" className="verifyBtn">
          Verify Account
        </button>
      </section>
    </form>
  );
}

export default VerifyOTPForm;
