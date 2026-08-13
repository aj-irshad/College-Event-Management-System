import apiRequest from "../api/apiRequest";

const login = async (loginData) => {
  return await apiRequest.post("/auth/login", loginData);
};

const signUp = async (signupData) => {
  return await apiRequest.post("/auth/signup", signupData);
};

const resetPassword = async (resetData) => {
  return await apiRequest.patch("/auth/reset", resetData);
};

const logout = async () => {
  return await apiRequest.post("/auth/logout");
};

const getUserProfile = async () => {
  return await apiRequest.get("/auth/me");
};

const verifyOTP = async (otpData) => {
  return await apiRequest.post("/auth/verify-otp", otpData);
};

export { login, signUp, resetPassword, logout, getUserProfile, verifyOTP };
