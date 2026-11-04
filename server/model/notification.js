import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  message: { type: String, required: true, trim: true, maxlength: 500 },
  type: { type: String, enum: ["blog", "event", "poll", "feedback"], required: true },
  linkId: { type: mongoose.Schema.Types.ObjectId, required: true },
  read: { type: Boolean, default: false },
  isExpiryReminder: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
notificationSchema.index(
  { recipient: 1, type: 1, linkId: 1, isExpiryReminder: 1 },
  {
    unique: true,
    partialFilterExpression: {
      recipient: { $exists: true },
      isExpiryReminder: { $exists: true },
    },
  },
);

export default mongoose.model("Notification", notificationSchema);
