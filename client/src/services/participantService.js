import apiRequest from "../api/apiRequest";

const participateInEvent = (participantData) => {
  return apiRequest.post("/participant/participate", participantData);
};

const getMyParticipation = () => {
  return apiRequest.get("/participant/my-participation");
};

const getAllParticipants = () => {
  return apiRequest.get("/participant/admin/all");
};
export { participateInEvent, getMyParticipation, getAllParticipants };
