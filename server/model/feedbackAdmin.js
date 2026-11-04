import mongoose from "mongoose";

const FeedbackOptionSchema = new mongoose.Schema(
  {
    optionId: { type: String, required: true, trim: true },
    text: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const FeedbackQuestionSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true, trim: true },
    text: { type: String, required: true, trim: true },
    type: { type: String, enum: ["radio", "textarea", "dropdown"], required: true },
    required: { type: Boolean, required: true, default: false },
    options: { type: [FeedbackOptionSchema], default: [] },
  },
  { _id: false },
);

const FeedbackFormSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },

    // Retained for compatibility with forms and responses created by the old UI.
    question: {
      type: String,
      trim: true,
    },
    title: { type: String, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 2000, default: "" },
    questions: { type: [FeedbackQuestionSchema], default: [] },
    startsAt: { type: Date },
    endsAt: { type: Date },
    isPublished: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
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
