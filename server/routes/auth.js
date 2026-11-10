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
} from "../controller/auth.js";

import uploadProfileImage from "../middleware/multerUpload.js";

import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  limitPasswordResetCompletions,
  limitPasswordResetRequests,
} from "../middleware/passwordResetRateLimit.js";
const authRouter = express.Router();

authRouter.get("/alluser", testAPI);
authRouter.get("/me", authMiddleware, getCurrentUser);
authRouter.post("/signup", uploadProfileImage("profile-img"), userSignUp);
authRouter.post("/verify-otp", verifyOTP);
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
