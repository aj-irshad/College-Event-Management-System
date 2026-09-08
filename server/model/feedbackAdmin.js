import mongoose from "mongoose";

const FeedbackFormSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },

    question: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

// Delete document 48 hours after createdAt
FeedbackFormSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 48 * 60 * 60 },
);

const FeedbackForm = mongoose.model("FeedbackForm", FeedbackFormSchema);

export default FeedbackForm;
