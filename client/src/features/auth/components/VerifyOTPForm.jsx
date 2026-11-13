import { LoaderCircle } from "lucide-react";

function VerifyOTPForm({
  email,
  otp,
  setOtp,
  warning,
  handleSubmit,
  isSubmitting,
  deliveryStatus,
  resendSeconds,
  isResending,
  handleResend,
}) {
  const deliveryMessage = {
    checking: "Email status is unavailable. Request a new verification code.",
    queued: "This signup used the previous email flow. Request a new verification code to continue.",
    processing: "This signup used the previous email flow. Request a new verification code to continue.",
    sending: "Email delivery was interrupted. Request a new verification code to continue.",
    sent: "Verification email sent. Check your inbox and spam folder.",
    failed: "Email delivery failed. You can request another verification email.",
    unknown: "Email status is unavailable. Request a new verification code.",
  }[deliveryStatus] || "Enter the verification code sent to your inbox.";

  return (
    <form className="verifyForm" onSubmit={handleSubmit}>
      <section className="heading">
        <h2>Enter OTP</h2>
        <p>
          Verification code for <strong>{email}</strong>
        </p>
      </section>

      <p className={`otpDeliveryStatus otpDeliveryStatus--${deliveryStatus}`} aria-live="polite">
        {deliveryMessage}
      </p>

      <section className="formGrp otpGroup">
        <label htmlFor="otp">4-Digit Verification Code</label>
        <input
          type="text"
          id="otp"
          placeholder="● ● ● ●"
          maxLength={4}
          value={otp}
          disabled={isSubmitting}
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
        <button type="submit" className="verifyBtn" disabled={isSubmitting}>
          {isSubmitting && <LoaderCircle className="verify-spinner" size={16} aria-hidden="true" />}
          {isSubmitting ? "Verifying..." : "Verify Account"}
        </button>
        <button
          type="button"
          className="resendOtpBtn"
          onClick={handleResend}
          disabled={isResending || resendSeconds > 0}
        >
          {isResending && <LoaderCircle className="verify-spinner" size={16} aria-hidden="true" />}
          {isResending
            ? "Requesting..."
            : resendSeconds > 0
              ? `Resend code in ${resendSeconds}s`
              : "Resend verification email"}
        </button>
      </section>
    </form>
  );
}

export default VerifyOTPForm;
