import FeedbackForm from "../model/feedbackAdmin.js";
import Feedback from "../model/feedback.js";

const createFeedback = async (req, res) => {
  try {
    const { event, question } = req.body;

    const feedback = await FeedbackForm.create({
      event,
      question,
    });

    res.status(201).json({
      message: "Feedback created successfully",
      feedback,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to create feedback",
    });
  }
};

const getFeedback = async (req, res) => {
  try {
    const feedback = await FeedbackForm.find().populate(
      "event",
      "title event_type",
    );

    res.status(200).json({
      feedback,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Failed to fetch feedback",
    });
  }
};

const submitFeedback = async (req, res) => {
  try {
    const { feedbackForm, event, ratings, comment } = req.body;

    const existingFeedback = await Feedback.findOne({
      feedbackForm,
      user: req.userId,
    });

    if (existingFeedback) {
      return res.status(400).json({
        message: "You have already submitted this feedback",
      });
    }

    const feedback = await Feedback.create({
      feedbackForm,
      event,
      user: req.userId,
      ratings,
      comment,
    });

    res.status(201).json({
      message: "Feedback submitted successfully",
      feedback,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Failed to submit feedback",
    });
  }
};

export { createFeedback, getFeedback, submitFeedback };
