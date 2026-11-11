import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true, index: true },
    event: { type: mongoose.Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    participationType: {
      type: String,
      enum: ["Participant", "Volunteer", "Organizing Member"],
      required: true,
    },
    amount: { type: Number, required: true, min: 0.01 },
    currency: { type: String, enum: ["NPR"], default: "NPR", required: true },
    method: { type: String, enum: ["Manual eSewa QR"], default: "Manual eSewa QR", required: true },
    proofFilename: { type: String, default: "" },
    proofUrl: { type: String, default: "" },
    proofPublicId: { type: String, default: "" },
    proofResourceType: { type: String, enum: ["image", "raw"], default: "image" },
    proofMimeType: { type: String, enum: ["image/jpeg", "image/png", "application/pdf"], required: true },
    transactionReference: { type: String, trim: true, maxlength: 100, default: "" },
    status: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending", required: true },
    isActive: { type: Boolean, default: true, required: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Users", default: null },
    reviewedAt: { type: Date, default: null },
    rejectionReason: { type: String, trim: true, maxlength: 500, default: "" },
  },
  { timestamps: true },
);

// Pending and approved records occupy the user's event slot. Rejection releases it
// so a new proof can be submitted while retaining the rejected record as history.
paymentSchema.index(
  { event: 1, user: 1 },
  { unique: true, partialFilterExpression: { isActive: true }, name: "one_active_payment_per_user_event" },
);

const Payment = mongoose.model("Payment", paymentSchema);

export default Payment;
