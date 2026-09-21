import apiRequest from "../api/apiRequest.js";

// ADMIN CREAT POLL FORMS
const createPoll = (pollData) => {
  return apiRequest.post("/polls/create-poll", pollData);
};

// USER REQUEST POLLS FOR VOTING
const fetchPollForm = () => {
  return apiRequest.get("/polls/fetch-pollForms");
};

// USER VOTES OF POLL FORMS
const submitPollVote = async (pollId, selectedOption) => {
  const response = await apiRequest.post("/polls/user-vote", {
    pollId,
    selectedOption,
  });
  return response.data;
};

// GET POLLS ALREADY VOTED BY USERS
const getUserVotes = async () => {
  const response = await apiRequest.get("/polls/votes");
  return response.data;
};

// ADMIN GET RESULT
const fetchPollResult = async () => {
  return await apiRequest.get("/polls/results");
};

//  delete poll
const deletePoll = async (pollId) => {
  return apiRequest.delete(`/polls/delete/${pollId}`);
};

// ADMIN UPDATE POLL
const updatePoll = async (pollId, pollData) => {
  return apiRequest.put(`/polls/update/${pollId}`, pollData);
};
export {
  createPoll,
  fetchPollForm,
  submitPollVote,
  getUserVotes,
  fetchPollResult,
  deletePoll,
  updatePoll,
};
