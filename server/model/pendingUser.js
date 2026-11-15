import mongoose from "mongoose";
import { EVENT_SEMESTERS } from "../utils/eventTargeting.js";

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

    // `otp` is select:false only to safely unset plaintext values from legacy records.
    otp: { type: String, select: false },
    otpHash: { type: String, default: null, select: false },
    pendingOtpHash: { type: String, default: null, select: false },
    otpExpires: { type: Date, default: null },
    otpAttempts: { type: Number, default: 0 },
    otpResendCount: { type: Number, default: 0 },
    otpSendCount: { type: Number, default: 0 },
    resendAvailableAt: { type: Date, default: null },
    otpSendLockUntil: { type: Date, default: null, select: false },
    verificationLockUntil: { type: Date, default: null, select: false },
    registrationExpiresAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
);

const PendingUser = mongoose.model("PendingUser", pendingUserSchema);

export default PendingUser;
