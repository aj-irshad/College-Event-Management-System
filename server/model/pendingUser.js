import mongoose from "mongoose";
import { EVENT_SEMESTERS } from "../utils/eventTargeting.js";

const otpEmailDeliverySchema = new mongoose.Schema(
  {
    jobId: { type: String, required: true },
    status: {
      type: String,
      enum: ["queued", "processing", "sent", "failed"],
      required: true,
    },
    encryptedOtp: String,
    otpIv: String,
    otpAuthTag: String,
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
    nextAttemptAt: Date,
    lockedUntil: Date,
    workerId: String,
    queuedAt: Date,
    sentAt: Date,
    failedAt: Date,
    lastErrorCode: String,
  },
  { _id: false },
);

const pendingUserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    contact: {
      type: String,
      required: true,
    },

    department: {
      type: String,
      required: true,
    },

    semester: {
      type: String,
      enum: EVENT_SEMESTERS,
      required: true,
    },

    profileImage: {
      type: String,
      default: "",
    },
    profileImagePublicId: {
      type: String,
      default: "",
    },

    // `otp` is retained for pending records created before the hashed OTP flow.
    otp: String,
    otpHash: String,
    otpSalt: String,
    otpAttempts: { type: Number, default: 0 },
    otpResendCount: { type: Number, default: 0 },
    otpExpires: Date,
    signupTokenHash: String,
    signupTokenRotatedAt: Date,
    registrationExpiresAt: Date,
    resendAvailableAt: Date,
    emailStatus: { type: String, enum: ["sending", "sent", "failed"] },
    emailSentAt: Date,
    emailLastErrorCode: String,
    emailSendClaimId: String,
    emailSendClaimExpiresAt: Date,
    verificationClaimId: String,
    verificationClaimExpiresAt: Date,
    // Retained to read existing queue-backed pending records during transition.
    emailDelivery: otpEmailDeliverySchema,
  },
  {
    timestamps: true,
  },
);

pendingUserSchema.index(
  { registrationExpiresAt: 1, verificationClaimExpiresAt: 1 },
  { name: "pending_signup_expiry" },
);

const PendingUser = mongoose.model("PendingUser", pendingUserSchema);

export default PendingUser;
