import mongoose from "mongoose";
const pendingUserSchema = new mongoose.Schema(
  {
    name: String,
    email: {
      type: String,
      unique: true,
    },
    password: String,
    profileImage: String,

    otp: String,

    otpExpires: Date,
  },
  { timestamps: true },
);

const PendingUser = mongoose.model("PendingUser", pendingUserSchema);

export default PendingUser;
