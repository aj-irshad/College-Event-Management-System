import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.NODEMAILER_EMAIL,
    pass: process.env.NODEMAILER_PASS,
  },
});

async function sendOTP(email, otp) {
  try {
    const info = await transporter.sendMail({
      from: `"EMS" <${process.env.NODEMAILER_EMAIL}>`,
      to: email,
      subject: "Verification Code - EMS",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Your Verification Code</h2>
          <p style="font-size: 24px; font-weight: bold; color: #6565fa;">${otp}</p>
          <p>Please enter this OTP to proceed with your verification.</p>
        </div>
      `,
    });
    return info;
  } catch (err) {
    console.error("Error sending email:", err.message);
    throw err;
  }
}

async function sendPasswordResetEmail(email, resetUrl, expiresMinutes = 20) {
  const safeUrl = resetUrl.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
  return transporter.sendMail({
    from: `"EMS" <${process.env.NODEMAILER_EMAIL}>`,
    to: email,
    subject: "Reset your EMS password",
    text: `Use this secure link to reset your EMS password. It expires in ${expiresMinutes} minutes. If you did not request this reset, ignore this email.\n\n${resetUrl}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:28px;color:#1e293b;background:#ffffff;">
        <div style="padding:24px;border-radius:12px;background:#f5f6ff;text-align:center;">
          <h1 style="margin:0;color:#6565f6;font-size:26px;">EMS</h1>
          <p style="margin:8px 0 0;color:#475569;">Event Management System</p>
        </div>
        <h2 style="margin:28px 0 12px;">Reset your password</h2>
        <p>We received a request to reset your EMS account password. Use the button below to choose a new password.</p>
        <p style="margin:26px 0;text-align:center;">
          <a href="${safeUrl}" style="display:inline-block;padding:13px 22px;border-radius:8px;background:#6565f6;color:#ffffff;text-decoration:none;font-weight:600;">Reset password</a>
        </p>
        <p>This link expires in <strong>${expiresMinutes} minutes</strong> and can be used once.</p>
        <p>If you did not request this reset, ignore this email. Your password will not change.</p>
        <p style="margin-top:28px;color:#64748b;font-size:13px;">If the button does not work, copy and paste this address into your browser:<br /><a href="${safeUrl}" style="color:#4f46e5;">${safeUrl}</a></p>
      </div>
    `,
  });
}

export { sendPasswordResetEmail };
export default sendOTP;
