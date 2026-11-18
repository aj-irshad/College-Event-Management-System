import apiRequest from "../api/apiRequest";

const buildEventFormData = (eventData, attachments = [], removeAttachmentIds = []) => {
  const formData = new FormData();
  formData.append("eventData", JSON.stringify(eventData));
  attachments.forEach((file) => formData.append("attachments", file));
  if (removeAttachmentIds.length) {
    formData.append("removeAttachmentIds", JSON.stringify(removeAttachmentIds));
  }
  return formData;
};

const createEvent = async (eventData, attachments = [], onUploadProgress) => {
  return apiRequest.post("/events/new-event", buildEventFormData(eventData, attachments), { onUploadProgress });
};

const getEvents = async () => {
  return apiRequest.get("/events/get-events");
};

const getEventById = async (eventId) => {
  return apiRequest.get(`/events/${eventId}`);
};

const deleteEvent = async (eventId) => {
  return apiRequest.delete(`/events/delete-event/${eventId}`);
};

const updateEvent = async (id, eventData, attachments = [], removeAttachmentIds = [], onUploadProgress) => {
  return apiRequest.patch(
    `/events/edit-event/${id}`,
    buildEventFormData(eventData, attachments, removeAttachmentIds),
    { onUploadProgress },
  );
};

const getEventAttachmentFile = async (eventId, attachmentId, download = false) => {
  const query = download ? "?download=1" : "";
  const response = await apiRequest.get(`/events/attachment/${eventId}/${attachmentId}${query}`, {
    responseType: "blob",
  });
  return response.data;
};

export { createEvent, getEvents, getEventById, deleteEvent, updateEvent, getEventAttachmentFile };
