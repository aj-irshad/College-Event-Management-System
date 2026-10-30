import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ["blog", "event", "poll", "feedback"],
      required: true,
    },
    linkId: { type: mongoose.Schema.Types.ObjectId },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "Users" }],
    isExpiryReminder: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, expires: "5d" },
  },
  { timestamps: true },
);

notificationSchema.index(
  { type: 1, linkId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isExpiryReminder: true,
      linkId: { $exists: true },
    },
  },
);

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
