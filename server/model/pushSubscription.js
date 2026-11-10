import mongoose from "mongoose";

const pushSubscriptionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "Users", required: true, index: true },
    deviceId: { type: String, required: true, trim: true, maxlength: 128 },
    endpoint: { type: String, required: true, trim: true, maxlength: 2048, select: false },
    keys: {
      p256dh: { type: String, required: true, select: false },
      auth: { type: String, required: true, select: false },
    },
  },
  { timestamps: true },
);

pushSubscriptionSchema.index({ endpoint: 1 }, { unique: true, name: "unique_push_endpoint" });

export default mongoose.model("PushSubscription", pushSubscriptionSchema);
