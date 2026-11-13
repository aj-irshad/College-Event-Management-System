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

    // `otp` is retained for pending records created before the hashed OTP flow.
    otp: String,
    otpHash: String,
    otpSalt: String,
    otpAttempts: { type: Number, default: 0 },
    otpResendCount: { type: Number, default: 0 },
    otpExpires: Date,
    registrationExpiresAt: Date,
    resendAvailableAt: Date,
    verificationClaimId: String,
    verificationClaimExpiresAt: Date,
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
