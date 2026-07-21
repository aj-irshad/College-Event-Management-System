import express from "express";
import { setUserProfile } from "../controller/user.js";
import authMiddleware from "../middleware/authMiddleware.js";

const userRouter = express.Router();

userRouter.get("/profile", authMiddleware, setUserProfile);
// userRouter.delete("/deleteAccount", deleteAccount);

export default userRouter;
