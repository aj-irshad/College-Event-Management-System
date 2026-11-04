import apiRequest from "../api/apiRequest";

const participateInEvent = (participantData) => {
  return apiRequest.post("/participant/participate", participantData);
};

const getMyParticipation = () => {
  return apiRequest.get("/participant/my-participation");
};

const getAllParticipants = (filters = {}) => {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== "" && value !== "All"),
  );
  return apiRequest.get("/participant/admin/all", { params });
};

const updateParticipationApproval = (id, approvalStatus) =>
  apiRequest.patch(`/participant/admin/${id}/approval`, { approvalStatus });

export {
  participateInEvent,
  getMyParticipation,
  getAllParticipants,
  updateParticipationApproval,
};
