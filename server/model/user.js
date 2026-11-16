import mongoose from "mongoose";
import { EVENT_SEMESTERS } from "../utils/eventTargeting.js";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: function () { return this.role !== "admin"; },
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
      required: function () { return this.role !== "admin"; },
      trim: true,
    },

    department: {
      type: String,
      required: function () { return this.role !== "admin"; },
      trim: true,
    },

    semester: {
      type: String,
      enum: EVENT_SEMESTERS,
      default: undefined,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    profileImage: {
      type: String,
      default: "",
    },
    profileImagePublicId: {
      type: String,
      default: "",
    },
    passwordResetTokenHash: {
      type: String,
      select: false,
    },
    passwordResetExpiresAt: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
  },
);

const Users = mongoose.model("Users", userSchema);

export default Users;
