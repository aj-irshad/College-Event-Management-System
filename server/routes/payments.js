import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";
import { uploadPaymentProof } from "../middleware/multerUpload.js";
import {
  getPaymentQr,
  submitManualPayment,
  getMyPayments,
  getAdminPayments,
  getMyPaymentProof,
  getAdminPaymentProof,
  reviewPayment,
  getEventRevenue,
} from "../controller/payment.js";

const paymentRouter = express.Router();

paymentRouter.get("/events/:eventId/qr", authMiddleware, getPaymentQr);
paymentRouter.post("/submit", authMiddleware, uploadPaymentProof, submitManualPayment);
paymentRouter.get("/my", authMiddleware, getMyPayments);
paymentRouter.get("/my/:paymentId/proof", authMiddleware, getMyPaymentProof);
paymentRouter.get("/admin/revenue", authMiddleware, adminMiddleware, getEventRevenue);
paymentRouter.get("/admin", authMiddleware, adminMiddleware, getAdminPayments);
paymentRouter.get("/admin/:paymentId/proof", authMiddleware, adminMiddleware, getAdminPaymentProof);
paymentRouter.patch("/admin/:paymentId/review", authMiddleware, adminMiddleware, reviewPayment);

export default paymentRouter;
