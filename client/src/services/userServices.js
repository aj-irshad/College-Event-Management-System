import apiRequest from "../api/apiRequest";

export const getProfile = () => {
  return apiRequest.get("/user/profile");
};
