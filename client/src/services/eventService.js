import apiRequest from "../api/apiRequest";

const createEvent = async (eventData) => {
  return apiRequest.post("/events/new-event", eventData);
};

const getEvents = async () => {
  return apiRequest.get("/events/get-events");
};

const deleteEvent = async (eventId) => {
  return apiRequest.delete(`/events/delete-event/${eventId}`);
};

const updateEvent = async (id, eventData) => {
  return apiRequest.patch(`/events/edit-event/${id}`, eventData);
};

export { createEvent, getEvents, deleteEvent, updateEvent };
