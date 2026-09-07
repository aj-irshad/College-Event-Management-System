import apiRequest from "../api/apiRequest";

const createFeedback = (feedbackData) => {
  return apiRequest.post("feedback/create-feedback", feedbackData);
};

const fetchFeedback = () => {
  return apiRequest.get("feedback/fetch-feedback");
};

const submitFeedback = (feedbackData) => {
  return apiRequest.post("feedback/submit-feedback", feedbackData);
};

const fetchAllFeedback = () => {
  return apiRequest.get("/feedback/all-feedback");
};

export { createFeedback, fetchFeedback, submitFeedback, fetchAllFeedback };
