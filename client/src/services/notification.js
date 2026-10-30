import apiRequest from "../api/apiRequest";

const fetchNotifications = async () => {
  const response = await apiRequest.get("/notification/");
  return response.data;
};

const markNotificationsAsRead = async () => {
  const response = await apiRequest.put(`/notification/mark-read`, {});
  return response.data;
};

const markNotificationAsRead = async (id) => {
  const response = await apiRequest.patch(`/notification/${id}/read`, {});
  return response.data;
};

export {
  fetchNotifications,
  markNotificationsAsRead,
  markNotificationAsRead,
};
