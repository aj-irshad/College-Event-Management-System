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

async function sendEventNotification(email, event) {
  try {
    const info = await transporter.sendMail({
      from: `"EMS" <${process.env.NODEMAILER_EMAIL}>`,
      to: email,
      subject: `New Event Added - ${event.title}`,

      html: `
        <div style="
          font-family: Arial, sans-serif;
          max-width: 600px;
          margin: auto;
          padding: 25px;
          background-color: #ffffff;
          color: #1e293b;
        ">

          <h2 style="
            color: #5c5be5;
            margin-bottom: 10px;
          ">
            New Event Added
          </h2>

          <p>
            A new event has been added to the College Event Management System.
          </p>

          <div style="
            margin: 20px 0;
            padding: 20px;
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
          ">

            <h3 style="
              margin-top: 0;
              color: #1e293b;
            ">
              ${event.title}
            </h3>

            <p>
              <strong>Event Type:</strong>
              ${event.event_type}
            </p>

            <p>
              <strong>Venue:</strong>
              ${event.venue}
            </p>

            <p>
              <strong>Start:</strong>
              ${new Date(event.start_at).toLocaleString()}
            </p>

            <p>
              <strong>End:</strong>
              ${new Date(event.end_at).toLocaleString()}
            </p>

            <p>
              <strong>Description:</strong>
              ${event.description}
            </p>

          </div>

          <p>
            Please check the EMS website for more details.
          </p>

          <p style="
            margin-top: 30px;
            color: #64748b;
            font-size: 14px;
          ">
            This is an automated notification from EMS.
          </p>

        </div>
      `,
    });
    return info;
  } catch (err) {
    console.error(`Error sending event notification to ${email}:`, err.message);

    throw err;
  }
}

export default sendEventNotification;
