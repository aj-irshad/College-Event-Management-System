import apiRequest from "../api/apiRequest";

const createEvent = async (eventData) => {
  return apiRequest.post("/events/new-event", eventData);
};

const getEvents = async () => {
  return apiRequest.get("/events/get-events");
};

export { createEvent, getEvents };
