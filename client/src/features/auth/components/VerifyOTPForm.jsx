import { LoaderCircle } from "lucide-react";

function VerifyOTPForm({
  email,
  otp,
  setOtp,
  warning,
  info,
  handleSubmit,
  isSubmitting,
  isResending,
  resendSecondsLeft,
  handleResend,
}) {
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
          disabled={isSubmitting || isResending}
          onChange={(e) => {
            // Only allow numbers
            const value = e.target.value.replace(/\D/g, "");
            setOtp(value);
          }}
          required
        />
      </section>

      {warning && <p className="warning">* {warning}</p>}
      {info && <p className="otpInfo" role="status">{info}</p>}

      <section className="btnSection">
        <button type="submit" className="verifyBtn" disabled={isSubmitting || isResending}>
          {isSubmitting && <LoaderCircle className="verify-spinner" size={16} aria-hidden="true" />}
          {isSubmitting ? "Verifying..." : "Verify Account"}
        </button>
        <button
          type="button"
          className="resendOtpBtn"
          onClick={handleResend}
          disabled={isSubmitting || isResending || resendSecondsLeft > 0}
        >
          {isResending && <LoaderCircle className="verify-spinner" size={16} aria-hidden="true" />}
          {isResending
            ? "Sending..."
            : resendSecondsLeft > 0
              ? `Resend OTP in ${Math.floor(resendSecondsLeft / 60)}:${String(resendSecondsLeft % 60).padStart(2, "0")}`
              : "Resend OTP"}
        </button>
      </section>
    </form>
  );
}

export default VerifyOTPForm;
