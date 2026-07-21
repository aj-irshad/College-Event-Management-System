function VerifyOTPForm({ otp, setOtp, warning, handleSubmit }) {
  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Enter OTP"
        maxLength={4}
        value={otp}
        onChange={(e) => {
          const value = e.target.value.replace(/\D/g, "");
          setOtp(value);
        }}
      />

      {warning && <p className="warning">{warning}</p>}

      <button type="submit">Verify OTP</button>
    </form>
  );
}

export default VerifyOTPForm;
