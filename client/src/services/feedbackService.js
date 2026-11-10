import apiRequest from "../api/apiRequest";

//  ADMIN CREATE FEEDBAK
const createFeedback = (feedbackData) => {
  return apiRequest.post("feedback/create-feedback", feedbackData);
};

const fetchAdminFeedbackForms = () => apiRequest.get("/feedback/admin/forms");

const fetchAdminFeedbackForm = (feedbackFormId) =>
  apiRequest.get(`/feedback/admin/forms/${feedbackFormId}`);

const fetchAdminFeedbackResponses = (feedbackFormId) =>
  apiRequest.get(`/feedback/admin/forms/${feedbackFormId}/responses`);

const updateFeedback = (feedbackFormId, feedbackData) =>
  apiRequest.put(`/feedback/admin/forms/${feedbackFormId}`, feedbackData);

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
  fetchAdminFeedbackForms,
  fetchAdminFeedbackForm,
  fetchAdminFeedbackResponses,
  updateFeedback,
  submitFeedback,
  fetchAllFeedback,
  deleteFeedbackForm,
};
