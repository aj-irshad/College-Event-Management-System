import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";
import {
  createFeedback,
  getFeedback,
  submitFeedback,
  getAllFeedback,
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

// admin feedback which user give feedback
feedbackRouter.get("/fetch-feedbackForms", authMiddleware, getFeedback);

feedbackRouter.post("/submit-feedback", authMiddleware, submitFeedback);

feedbackRouter.get(
  "/users-feedbacks",
  authMiddleware,
  adminMiddleware,
  getAllFeedback,
);
export default feedbackRouter;
