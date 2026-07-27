import mongoose from "mongoose";

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
