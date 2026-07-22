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

    console.log("Email sent:", info.messageId);
    return info;
  } catch (err) {
    console.error("Error sending email:", err.message);
    throw err;
  }
}

export default sendOTP;
