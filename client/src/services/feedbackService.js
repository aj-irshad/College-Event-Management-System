import apiRequest from "../api/apiRequest";

const createFeedback = (feedbackData) => {
  return apiRequest.post("feedback/create-feedback", feedbackData);
};

// feedback form for user to submit
const fetchFeedback = () => {
  return apiRequest.get("feedback/fetch-feedbackForms");
};

const submitFeedback = (feedbackData) => {
  return apiRequest.post("feedback/submit-feedback", feedbackData);
};

// user submitted feedback for admin page
const fetchAllFeedback = () => {
  return apiRequest.get("/feedback/users-feedbacks");
};

export { createFeedback, fetchFeedback, submitFeedback, fetchAllFeedback };
