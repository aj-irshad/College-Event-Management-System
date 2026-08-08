import apiRequest from "../api/apiRequest";

const createEvent = async (eventData) => {
  return apiRequest.post("/events/new-event", eventData);
};

export { createEvent };
