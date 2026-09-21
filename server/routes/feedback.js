import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";
import {
  createFeedback,
  getFeedback,
  submitFeedback,
  getAllFeedback,
  deleteFeedbackForm,
} from "../controller/feedback.js";
const feedbackRouter = express.Router();

// ADMIN CREATE FEEDBACK
feedbackRouter.post(
  "/create-feedback",
  authMiddleware,
  adminMiddleware,
  createFeedback,
);

// FEEDBACK FORM FOR USER
feedbackRouter.get("/fetch-feedbackForms", authMiddleware, getFeedback);

// USER SUBMIT REVIEW
feedbackRouter.post("/submit-feedback", authMiddleware, submitFeedback);

// USERS REVIEW FOR ADMIN PAGE
feedbackRouter.get(
  "/users-feedbacks",
  authMiddleware,
  adminMiddleware,
  getAllFeedback,
);

feedbackRouter.delete(
  "/delete-feedback/:feedbackFormId",
  authMiddleware,
  adminMiddleware,
  deleteFeedbackForm,
);

export default feedbackRouter;
