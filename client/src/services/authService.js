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

const requestPasswordReset = async (email) => {
  return apiRequest.post("/auth/forgot-password", { email });
};

const completePasswordReset = async (token, newPassword) => {
  return apiRequest.post("/auth/reset-password", { token, newPassword });
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

export {
  login,
  signUp,
  resetPassword,
  requestPasswordReset,
  completePasswordReset,
  logout,
  getUserProfile,
  verifyOTP,
};
