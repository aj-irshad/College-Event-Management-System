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

    otp: {
      type: String,
      required: true,
    },

    otpExpires: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

const PendingUser = mongoose.model("PendingUser", pendingUserSchema);

export default PendingUser;
