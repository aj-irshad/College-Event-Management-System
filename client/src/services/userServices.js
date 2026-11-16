import apiRequest from "../api/apiRequest";

export const getProfile = () => {
  return apiRequest.get("/user/profile");
};

export const createAdminAccount = (credentials) =>
  apiRequest.post("/user/admin", credentials);
