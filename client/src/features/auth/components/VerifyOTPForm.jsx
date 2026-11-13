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
  handleResend,
}) {
  return (
    <form className="verifyForm" onSubmit={handleSubmit}>
      <section className="heading">
        <h2>Enter OTP</h2>
        <p>
          Verification code for <strong>{email}</strong>
        </p>
      </section>

      <p className="otpDeliveryStatus" aria-live="polite">
        Enter the 4-digit code sent to your inbox. If it expired, you can request another.
      </p>

      <section className="formGrp otpGroup">
        <label htmlFor="otp">4-Digit Verification Code</label>
        <input
          type="text"
          id="otp"
          placeholder="● ● ● ●"
          maxLength={4}
          value={otp}
          disabled={isSubmitting || isResending}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
          required
        />
      </section>

      {warning && <p className="warning">* {warning}</p>}
      {info && <p className="otpDeliveryStatus" role="status">{info}</p>}

      <section className="btnSection">
        <button type="submit" className="verifyBtn" disabled={isSubmitting || isResending}>
          {isSubmitting && <LoaderCircle className="verify-spinner" size={16} aria-hidden="true" />}
          {isSubmitting ? "Verifying..." : "Verify Account"}
        </button>
        <button
          type="button"
          className="resendOtpBtn"
          onClick={handleResend}
          disabled={isSubmitting || isResending}
        >
          {isResending && <LoaderCircle className="verify-spinner" size={16} aria-hidden="true" />}
          {isResending ? "Sending..." : "Resend verification email"}
        </button>
      </section>
    </form>
  );
}

export default VerifyOTPForm;
