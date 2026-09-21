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

// FETCH FEEDBACK FORMS
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

// USER SUBMIT FEEDBACK
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

// ADMIN GETS USER REVIEW
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

// DELETE FEEDBACK FORM
const deleteFeedbackForm = async (req, res) => {
  try {
    const { feedbackFormId } = req.params;

    // Check if feedback form exists
    const feedbackForm = await FeedbackForm.findById(feedbackFormId);

    if (!feedbackForm) {
      return res.status(404).json({
        message: "Feedback form not found",
      });
    }

    // Delete the feedback form
    await FeedbackForm.findByIdAndDelete(feedbackFormId);

    // Delete all user feedback submitted for this form
    await Feedback.deleteMany({
      feedbackForm: feedbackFormId,
    });

    res.status(200).json({
      message: "Feedback form deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting feedback form:", error);

    res.status(500).json({
      message: "Failed to delete feedback form",
    });
  }
};
export {
  createFeedback,
  getFeedback,
  submitFeedback,
  getAllFeedback,
  deleteFeedbackForm,
};
