import apiRequest from "../api/apiRequest";

//  ADMIN CREATE FEEDBAK
const createFeedback = (feedbackData) => {
  return apiRequest.post("feedback/create-feedback", feedbackData);
};

// feedback form for user to submit
const fetchFeedbackForm = () => {
  return apiRequest.get("feedback/fetch-feedbackForms");
};

// USER FILL FORM AND SUBMIT
const submitFeedback = (feedbackData) => {
  return apiRequest.post("feedback/submit-feedback", feedbackData);
};

// USER'S REVIEW
const fetchAllFeedback = () => {
  return apiRequest.get("/feedback/users-feedbacks");
};

// DELETE FEEDBACK FORM
const deleteFeedbackForm = (feedbackFormId) => {
  return apiRequest.delete(`/feedback/delete-feedback/${feedbackFormId}`);
};

export {
  createFeedback,
  fetchFeedbackForm,
  submitFeedback,
  fetchAllFeedback,
  deleteFeedbackForm,
};
