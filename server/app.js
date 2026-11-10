import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import http from "http";
import { fileURLToPath } from "url";
import status from "express-status-monitor";
import { initIO } from "./socket.js";
dotenv.config();

import connection from "./connection.js";
import startEventStatusJob from "./controller/eventStatusJob.js";
import startExpiryReminderJob from "./controller/expiryReminderJob.js";
import startPollExpiryJob from "./controller/pollExpiryJob.js";
import startFeedbackPublicationJob from "./controller/feedbackPublicationJob.js";
import authRouter from "./routes/auth.js";
import userRouter from "./routes/user.js";
import eventRouter from "./routes/events.js";
import participantRouter from "./routes/participant.js";
import blogRouter from "./routes/blog.js";
import feedbackRouter from "./routes/feedback.js";
import pollRouter from "./routes/polls.js";
import notificationRouter from "./routes/notification.js";
import paymentRouter from "./routes/payments.js";
import { getUploadDirectory } from "./utils/uploadPaths.js";

const app = express();
const PORT = process.env.PORT || 5000;
const BASE_URL = process.env.BASE_URL;
const VITE_URL = process.env.VITE_BASE_URL;

const server = http.createServer(app);
const io = initIO(server, VITE_URL);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// MIDDLEWARE
app.use(
  status({
    websocket: io,
    socketPath: "/status-socket/",
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors({ origin: VITE_URL, credentials: true }));

// DB connection
connection().then(() => {
  startEventStatusJob();
  startExpiryReminderJob();
  startPollExpiryJob();
  startFeedbackPublicationJob();
});

const eventUploadDirectory = getUploadDirectory("events");
const blogUploadDirectory = getUploadDirectory("blogs");
const profileUploadDirectory = getUploadDirectory("profiles");
app.use("/uploads/events", express.static(eventUploadDirectory));
app.use("/uploads/blogs", express.static(blogUploadDirectory));
app.use("/uploads/profiles", express.static(profileUploadDirectory));
// Keep existing image URLs working while storage uses the canonical folders.
app.use("/uploads/blog", express.static(blogUploadDirectory));
app.use("/uploads/user", express.static(profileUploadDirectory));
// Legacy root-level upload names now resolve only inside the events folder.
app.use("/uploads", express.static(eventUploadDirectory));
app.use(express.static(path.join(__dirname, "../client/dist")));

app.use("/auth", authRouter);
app.use("/user", userRouter);
app.use("/events", eventRouter);
app.use("/blog", blogRouter);
app.use("/feedback", feedbackRouter);
app.use("/polls", pollRouter);
app.use("/participant", participantRouter);
app.use("/notification", notificationRouter);
app.use("/payments", paymentRouter);

app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/dist/index.html"));
});

server.listen(PORT, () => {
  console.log(`Server is listening at ${PORT}`);
});
