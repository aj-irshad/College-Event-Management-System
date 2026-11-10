import apiRequest from "../api/apiRequest";

const getEventPaymentQr = (eventId) =>
  apiRequest.get(`/payments/events/${encodeURIComponent(eventId)}/qr`, { responseType: "blob" });

const submitManualPayment = (formData) =>
  apiRequest.post("/payments/submit", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

const getMyPayments = () => apiRequest.get("/payments/my");
const getAdminPayments = (status = "All") => apiRequest.get("/payments/admin", { params: { status } });
const getAdminRevenue = () => apiRequest.get("/payments/admin/revenue");
const reviewPayment = (paymentId, decision, rejectionReason = "") =>
  apiRequest.patch(`/payments/admin/${encodeURIComponent(paymentId)}/review`, { decision, rejectionReason });

const getPaymentProof = async (url) => {
  const { data } = await apiRequest.get(url, { responseType: "blob" });
  return URL.createObjectURL(data);
};

export {
  getEventPaymentQr,
  submitManualPayment,
  getMyPayments,
  getAdminPayments,
  getAdminRevenue,
  reviewPayment,
  getPaymentProof,
};
