import apiRequest from "../api/apiRequest";

const login = async (loginData) => {
  const response = await apiRequest.post("/auth/login", loginData);
  return response;
};

const signUp = async (signupData) => {
  const response = await apiRequest.post("/auth/signup", signupData);
  return response;
};

const resetPassword = async (resetData) => {
  const response = await apiRequest.patch("/auth/reset", resetData);
  return response;
};

const logout = async () => {
  return await apiRequest.post("/auth/logout");
};

const getCurrentUser = async () => {
  return apiRequest.get("/auth/me");
};

const verifyOTP = async (otpData) => {
  return await apiRequest.post("/auth/verify-otp", otpData);
};

export { login, signUp, resetPassword, logout, getCurrentUser, verifyOTP };
