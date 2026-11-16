import express from "express";
import { setUserProfile, getStudentCountAdmin, createAdmin } from "../controller/user.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const userRouter = express.Router();

userRouter.get("/profile", authMiddleware, setUserProfile);
userRouter.get("/admin/student-count", authMiddleware, adminMiddleware, getStudentCountAdmin);
userRouter.post("/admin", authMiddleware, adminMiddleware, createAdmin);
// userRouter.delete("/deleteAccount", deleteAccount);

export default userRouter;
