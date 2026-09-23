import apiRequest from "../api/apiRequest";

const participateInEvent = (participantData) => {
  return apiRequest.post("/participant/participate", participantData);
};

const getMyParticipation = () => {
  return apiRequest.get("/participant/my-participation");
};

export { participateInEvent, getMyParticipation };
