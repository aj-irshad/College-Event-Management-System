import fs from "fs/promises";
import path from "path";
import Event from "../model/events.js";
import Participant from "../model/participants.js";
import Payment from "../model/payment.js";
import Users from "../model/user.js";
import { getIO } from "../socket.js";
import {
  getEsewaQrFile,
  readPrivatePaymentFile,
  removePaymentProof,
} from "../utils/paymentStorage.js";
import { isEventAvailableToUser } from "../utils/eventTargeting.js";

const participationTypes = ["Participant", "Volunteer", "Organizing Member"];
const validId = (value) => typeof value === "string" && /^[a-f\d]{24}$/i.test(value);
const emitSafely = (room, eventName, payload) => {
  try {
    getIO().to(room).emit(eventName, payload);
  } catch (error) {
    console.error(`Could not emit ${eventName}:`, error.message);
  }
};

const getPaymentQr = async (req, res) => {
  const { eventId } = req.params;
  if (!validId(eventId)) return res.status(400).json({ message: "Invalid event ID" });
  try {
    const [event, user] = await Promise.all([
      Event.findById(eventId),
      Users.findById(req.userId).select("role department semester"),
    ]);
    if (!user) return res.status(401).json({ message: "Please login" });
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (!isEventAvailableToUser(event, user)) return res.status(403).json({ message: "This event is not available to your department and semester" });
    if (Number(event.price) <= 0 || event.status === "Completed") {
      return res.status(403).json({ message: "This event is not eligible for payment" });
    }
    const participant = await Participant.findOne({ event: event._id, user: req.userId }).select("_id");
    if (participant) return res.status(409).json({ message: "You already have a participation record for this event" });
    const activePayment = await Payment.findOne({ event: event._id, user: req.userId, isActive: true }).select("status");
    if (activePayment) return res.status(409).json({ message: `A ${activePayment.status.toLowerCase()} payment already exists for this event` });

    const qrPath = getEsewaQrFile();
    const extension = path.extname(qrPath).toLowerCase();
    const contentType = extension === ".jpg" || extension === ".jpeg" ? "image/jpeg" : extension === ".png" ? "image/png" : null;
    if (!contentType) return res.status(503).json({ message: "The event payment QR is not configured" });
    const data = await fs.readFile(qrPath);
    const validImage = contentType === "image/png"
      ? data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
      : data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
    if (!validImage) return res.status(503).json({ message: "The configured payment QR image is invalid" });
    res.set({ "Content-Type": contentType, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
    return res.status(200).send(data);
  } catch (error) {
    if (error.code === "ENOENT") return res.status(503).json({ message: "The event payment QR has not been installed" });
    console.error("Could not serve payment QR:", error.message);
    return res.status(500).json({ message: "Could not load the payment QR" });
  }
};

const submitManualPayment = async (req, res) => {
  const { eventId, participationType = "Participant", transactionReference = "" } = req.body || {};
  let proofFilename = req.file?.filename;
  let resolvedEventId;
  const rejectAndRemoveProof = async (status, message) => {
    if (proofFilename) await removePaymentProof(proofFilename).catch(() => {});
    proofFilename = null;
    return res.status(status).json({ message });
  };

  if (!validId(eventId)) return rejectAndRemoveProof(400, "A valid event ID is required");
  if (!participationTypes.includes(participationType)) return rejectAndRemoveProof(400, "Invalid participation role");
  if (typeof transactionReference !== "string" || transactionReference.trim().length > 100) {
    return rejectAndRemoveProof(400, "Transaction reference must be 100 characters or fewer");
  }

  try {
    const [event, user] = await Promise.all([
      Event.findById(eventId),
      Users.findById(req.userId).select("role department semester"),
    ]);
    if (!user) return rejectAndRemoveProof(401, "Please login");
    if (!event) return rejectAndRemoveProof(404, "Event not found");
    if (!isEventAvailableToUser(event, user)) return rejectAndRemoveProof(403, "This event is not available to your department and semester");
    resolvedEventId = event._id;
    if (Number(event.price) <= 0 || event.status === "Completed") {
      return rejectAndRemoveProof(400, "This event is not eligible for paid registration");
    }
    if (await Participant.exists({ event: event._id, user: req.userId })) {
      return rejectAndRemoveProof(409, "You already have a participation record for this event");
    }
    if (await Payment.exists({ event: event._id, user: req.userId, isActive: true })) {
      return rejectAndRemoveProof(409, "A pending or approved payment already exists for this event");
    }
    const amount = Number(event.price);
    if (!Number.isFinite(amount) || amount <= 0) {
      return rejectAndRemoveProof(400, "The event payment amount is invalid");
    }

    const payment = await Payment.create({
      user: req.userId,
      event: event._id,
      participationType,
      amount,
      currency: "NPR",
      method: "Manual eSewa QR",
      proofFilename,
      proofMimeType: req.paymentProofMimeType,
      transactionReference: transactionReference.trim(),
    });
    proofFilename = null;

    emitSafely("admins", "payments:updated", { paymentId: String(payment._id), status: payment.status, eventId: String(event._id) });
    return res.status(201).json({ message: "Payment proof submitted for admin verification", payment: {
      _id: payment._id,
      event: payment.event,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      transactionReference: payment.transactionReference,
      createdAt: payment.createdAt,
    } });
  } catch (error) {
    if (proofFilename) await removePaymentProof(proofFilename).catch(() => {});
    if (error.code === 11000) {
      const indexName = error.message.match(/\bindex:\s+(?:[^ ]+\.)*\$?([^\s]+?)\s+dup key:/i)?.[1] || null;
      console.error("Payment duplicate-key conflict:", {
        indexName,
        keyPattern: error.keyPattern || null,
        keyValueFields: Object.keys(error.keyValue || {}),
      });

      try {
        const sameEventActivePayment = resolvedEventId && await Payment.exists({
          event: resolvedEventId,
          user: req.userId,
          isActive: true,
        });
        if (sameEventActivePayment) {
          return res.status(409).json({ message: "A pending or approved payment already exists for this event" });
        }
      } catch (verificationError) {
        console.error("Could not verify duplicate payment conflict:", {
          name: verificationError.name,
          code: verificationError.code,
        });
        return res.status(500).json({ message: "Could not verify payment submission conflict" });
      }

      return res.status(409).json({ message: "A conflicting record prevents this payment submission" });
    }
    console.error("Could not submit manual payment:", error.message);
    return res.status(500).json({ message: "Could not submit payment proof" });
  }
};

const serializePayment = (payment) => ({
  _id: payment._id,
  event: payment.event,
  user: payment.user,
  participationType: payment.participationType,
  amount: payment.amount,
  currency: payment.currency,
  method: payment.method,
  proofMimeType: payment.proofMimeType,
  transactionReference: payment.transactionReference,
  status: payment.status,
  reviewedAt: payment.reviewedAt,
  rejectionReason: payment.rejectionReason,
  createdAt: payment.createdAt,
  proofUrl: `/payments/my/${payment._id}/proof`,
});

const getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.userId })
      .populate("event", "title start_at end_at department status price")
      .sort({ createdAt: -1 });
    return res.status(200).json(payments.map(serializePayment));
  } catch (error) {
    console.error("Could not list user payments:", error.message);
    return res.status(500).json({ message: "Could not load your payment submissions" });
  }
};

const getAdminPayments = async (req, res) => {
  const status = req.query.status || "All";
  if (!["All", "Pending", "Approved", "Rejected"].includes(status)) {
    return res.status(400).json({ message: "Invalid payment status filter" });
  }
  try {
    const payments = await Payment.find(status === "All" ? {} : { status })
      .populate("user", "name email contact department")
      .populate("event", "title department start_at price")
      .sort({ createdAt: -1 });
    return res.status(200).json(payments.map((payment) => ({
      ...serializePayment(payment),
      user: payment.user,
      event: payment.event,
      proofUrl: `/payments/admin/${payment._id}/proof`,
      reviewedBy: payment.reviewedBy,
    })));
  } catch (error) {
    console.error("Could not list admin payments:", error.message);
    return res.status(500).json({ message: "Could not load payment submissions" });
  }
};

const sendProof = async (payment, res) => {
  try {
    const buffer = await readPrivatePaymentFile(payment.proofFilename);
    const disposition = payment.proofMimeType === "application/pdf" ? "attachment" : "inline";
    res.set({
      "Content-Type": payment.proofMimeType,
      "Content-Disposition": `${disposition}; filename="payment-proof${payment.proofMimeType === "application/pdf" ? ".pdf" : payment.proofMimeType === "image/png" ? ".png" : ".jpg"}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    });
    return res.status(200).send(buffer);
  } catch (error) {
    if (error.code === "ENOENT") return res.status(404).json({ message: "Payment proof is unavailable" });
    console.error("Could not read payment proof:", error.message);
    return res.status(500).json({ message: "Could not open payment proof" });
  }
};

const getMyPaymentProof = async (req, res) => {
  if (!validId(req.params.paymentId)) return res.status(400).json({ message: "Invalid payment ID" });
  try {
    const payment = await Payment.findOne({ _id: req.params.paymentId, user: req.userId }).select("proofFilename proofMimeType");
    if (!payment) return res.status(404).json({ message: "Payment proof not found" });
    return sendProof(payment, res);
  } catch (error) {
    return res.status(500).json({ message: "Could not open payment proof" });
  }
};

const getAdminPaymentProof = async (req, res) => {
  if (!validId(req.params.paymentId)) return res.status(400).json({ message: "Invalid payment ID" });
  try {
    const payment = await Payment.findById(req.params.paymentId).select("proofFilename proofMimeType");
    if (!payment) return res.status(404).json({ message: "Payment proof not found" });
    return sendProof(payment, res);
  } catch (error) {
    return res.status(500).json({ message: "Could not open payment proof" });
  }
};

const reviewPayment = async (req, res) => {
  const { paymentId } = req.params;
  const { decision, rejectionReason = "" } = req.body || {};
  if (!validId(paymentId)) return res.status(400).json({ message: "Invalid payment ID" });
  if (!["Approved", "Rejected"].includes(decision)) return res.status(400).json({ message: "Decision must be Approved or Rejected" });
  if (typeof rejectionReason !== "string" || rejectionReason.trim().length > 500) {
    return res.status(400).json({ message: "Rejection reason must be 500 characters or fewer" });
  }
  if (decision === "Rejected" && !rejectionReason.trim()) {
    return res.status(400).json({ message: "Provide a reason when rejecting a payment" });
  }

  try {
    const update = decision === "Approved"
      ? { $set: { status: "Approved", reviewedBy: req.userId, reviewedAt: new Date(), rejectionReason: "" } }
      : { $set: { status: "Rejected", isActive: false, reviewedBy: req.userId, reviewedAt: new Date(), rejectionReason: rejectionReason.trim() } };
    const payment = await Payment.findOneAndUpdate(
      { _id: paymentId, status: "Pending", isActive: true },
      update,
      { returnDocument: "after" },
    );
    if (!payment) return res.status(409).json({ message: "This payment is no longer pending review" });

    if (decision === "Approved") {
      try {
        await Participant.findOneAndUpdate(
          { event: payment.event, user: payment.user },
          { $set: { approvalStatus: "Approved" }, $setOnInsert: {
            event: payment.event,
            user: payment.user,
            participationType: payment.participationType,
          } },
          { upsert: true, returnDocument: "after", setDefaultsOnInsert: true },
        );
      } catch (error) {
        await Payment.updateOne(
          { _id: payment._id, status: "Approved", reviewedBy: req.userId },
          { $set: { status: "Pending", reviewedBy: null, reviewedAt: null, rejectionReason: "" } },
        ).catch(() => {});
        throw error;
      }
      emitSafely("admins", "participation:registered", { eventId: String(payment.event) });
    }

    const result = { paymentId: String(payment._id), status: payment.status, eventId: String(payment.event) };
    emitSafely(`user:${payment.user}`, "payments:status-updated", {
      ...result,
      rejectionReason: payment.rejectionReason,
    });
    emitSafely("admins", "payments:updated", result);
    return res.status(200).json({ message: `Payment ${decision.toLowerCase()}`, payment: result });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "A participation record already occupies this user and event" });
    console.error("Could not review payment:", error.message);
    return res.status(500).json({ message: "Could not review payment" });
  }
};

const getEventRevenue = async (_req, res) => {
  try {
    const revenue = await Payment.aggregate([
      { $match: { status: "Approved" } },
      { $group: { _id: "$event", amount: { $sum: "$amount" }, paymentCount: { $sum: 1 } } },
    ]);
    const events = await Event.find({ price: { $gt: 0 } }).select("title department price").sort({ title: 1 }).lean();
    const revenueByEvent = new Map(revenue.map((row) => [String(row._id), row]));
    return res.status(200).json(events.map((event) => {
      const row = revenueByEvent.get(String(event._id));
      return {
        event,
        revenue: row?.amount || 0,
        currency: "NPR",
        approvedPaymentCount: row?.paymentCount || 0,
      };
    }));
  } catch (error) {
    console.error("Could not calculate event revenue:", error.message);
    return res.status(500).json({ message: "Could not load event revenue" });
  }
};

export {
  getPaymentQr,
  submitManualPayment,
  getMyPayments,
  getAdminPayments,
  getMyPaymentProof,
  getAdminPaymentProof,
  reviewPayment,
  getEventRevenue,
};
