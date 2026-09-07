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

const FeedbackForm = mongoose.model("FeedbackForm", FeedbackFormSchema);

export default FeedbackForm;
