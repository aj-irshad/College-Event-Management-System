import {
  testAPI,
  userLogin,
  userSignUp,
  verifyOTP,
  logout,
  resetPassword,
  getCurrentUser,
} from "../controller/auth.js";

import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
const authRouter = express.Router();

authRouter.get("/alluser", testAPI);
authRouter.get("/me", authMiddleware, getCurrentUser);
authRouter.post("/signup", userSignUp);
authRouter.post("/verify-otp", verifyOTP);
authRouter.post("/login", userLogin);
authRouter.post("/logout", logout);
authRouter.patch("/reset", authMiddleware, resetPassword);

export default authRouter;
