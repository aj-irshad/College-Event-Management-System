import mongoose from "mongoose";

const FeedbackSchema = new mongoose.Schema(
  {
    feedbackForm: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FeedbackForm",
      required: true,
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },
    comment: {
      type: String,
      required: true,
    },
    ratings: {
      type: Number,
      enum: [1, 2, 3, 4, 5],
      required: true,
    },
  },
  { timestamps: true },
);

FeedbackSchema.index({ event: 1, user: 1 }, { unique: true });

const Feedback = mongoose.model("Feedback", FeedbackSchema);

export default Feedback;
