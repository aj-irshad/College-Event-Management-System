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
    // Legacy response fields remain available for existing records/forms.
    comment: { type: String },
    ratings: {
      type: Number,
      enum: [1, 2, 3, 4, 5],
    },
    answers: {
      type: [
        new mongoose.Schema(
          {
            questionId: { type: String, required: true },
            questionText: { type: String },
            answerType: { type: String, enum: ["radio", "textarea", "dropdown"], required: true },
            selectedOptionId: { type: String },
            selectedOptionText: { type: String },
            textAnswer: { type: String },
          },
          { _id: false },
        ),
      ],
      default: undefined,
    },
  },
  { timestamps: true },
);

FeedbackSchema.index({ event: 1, user: 1 }, { unique: true });

const Feedback = mongoose.model("Feedback", FeedbackSchema);

export default Feedback;
