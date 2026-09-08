import FeedbackForm from "../model/feedbackAdmin.js";
import Feedback from "../model/feedback.js";

// create feedback
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

// user fetch feedback form for submit
const getFeedback = async (req, res) => {
  try {
    const submittedFeedback = await Feedback.find({
      user: req.userId,
    }).select("feedbackForm");

    const submittedFormIds = submittedFeedback.map(
      (feedback) => feedback.feedbackForm,
    );

    const feedback = (
      await FeedbackForm.find({
        _id: { $nin: submittedFormIds },
      }).populate("event", "title event_type")
    ).filter((feedback) => feedback.event !== null);

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

// submit feedback
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

const getAllFeedback = async (req, res) => {
  try {
    const feedback = await Feedback.find()
      .populate("user", "name email")
      .populate("event", "title");

    res.status(200).json({
      success: true,
      feedback,
    });
  } catch (error) {
    console.error("Error fetching feedback:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch feedback",
    });
  }
};

export { createFeedback, getFeedback, submitFeedback, getAllFeedback };
