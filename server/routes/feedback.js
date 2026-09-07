import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";
import {
  createFeedback,
  getFeedback,
  submitFeedback,
} from "../controller/feedback.js";
const feedbackRouter = express.Router();

feedbackRouter.get("/test", (req, res) => {
  res.status(200).json({
    message: "Successfully reached feedback route",
  });
});

feedbackRouter.post(
  "/create-feedback",
  authMiddleware,
  adminMiddleware,
  createFeedback,
);

feedbackRouter.get("/fetch-feedback", authMiddleware, getFeedback);

feedbackRouter.post("/submit-feedback", authMiddleware, submitFeedback);

export default feedbackRouter;
