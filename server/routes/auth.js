import {
  testAPI,
  userLogin,
  userSignUp,
  verifyOTP,
  logout,
  resetPassword,
  getCurrentUser,
  requestPasswordReset,
  completePasswordReset,
  getOtpDeliveryStatus,
  resendOTP,
} from "../controller/auth.js";

import uploadProfileImage from "../middleware/multerUpload.js";

import express from "express";
import { randomUUID } from "crypto";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  limitPasswordResetCompletions,
  limitPasswordResetRequests,
} from "../middleware/passwordResetRateLimit.js";
const authRouter = express.Router();

const signupRequestTiming = (req, res, next) => {
  req.requestId = randomUUID();
  req.requestStartedAt = Date.now();
  res.setHeader("X-Request-ID", req.requestId);
  res.once("finish", () => {
    console.info("Signup and OTP HTTP timing (ms):", {
      requestId: req.requestId,
      method: req.method,
      route: req.path,
      uploadMs: req.signupUploadMs ?? (
        req.signupUploadStartedAt ? Date.now() - req.signupUploadStartedAt : null
      ),
      totalMs: Date.now() - req.requestStartedAt,
      statusCode: res.statusCode,
    });
  });
  next();
};

const profileUpload = uploadProfileImage("profile-img");
const timedSignupUpload = (req, res, next) => {
  req.signupUploadStartedAt = Date.now();
  profileUpload(req, res, (error) => {
    req.signupUploadMs = Date.now() - req.signupUploadStartedAt;
    next(error);
  });
};

authRouter.get("/alluser", testAPI);
authRouter.get("/me", authMiddleware, getCurrentUser);
authRouter.post("/signup", signupRequestTiming, timedSignupUpload, userSignUp);
authRouter.post("/verify-otp", signupRequestTiming, verifyOTP);
authRouter.post("/resend-otp", signupRequestTiming, resendOTP);
authRouter.post("/otp-status", signupRequestTiming, getOtpDeliveryStatus);
authRouter.post("/login", userLogin);
authRouter.post("/logout", logout);
authRouter.post("/forgot-password", limitPasswordResetRequests, requestPasswordReset);
authRouter.post(
  "/reset-password",
  limitPasswordResetCompletions,
  completePasswordReset,
);
authRouter.patch("/reset", authMiddleware, resetPassword);

export default authRouter;
