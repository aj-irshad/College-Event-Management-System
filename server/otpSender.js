import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendOTP(email, otp) {
  try {
    const info = await transporter.sendMail({
      from: `"EMS" <${process.env.EMAIL_USER}>`,
      to: `${email}`,
      subject: "Regarding the Project",
      html: `<h1>Your OTP is ${otp} </h1>`,
    });

    console.log("Email sent:", info.messageId);
  } catch (err) {
    console.log(err);
  }
}

export default sendOTP;
