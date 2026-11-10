import mongoose from "mongoose";
import { EVENT_DEPARTMENTS, EVENT_SEMESTERS } from "../utils/eventTargeting.js";

const pollAudienceTargetSchema = new mongoose.Schema({
  department: { type: String, enum: EVENT_DEPARTMENTS, required: true },
  semesters: [{ type: String, enum: EVENT_SEMESTERS, required: true }],
}, { _id: false });

const PollsFormSchema = new mongoose.Schema({
  question: {
    type: String,
    require: true,
  },
  options: {
    type: [String],
    required: true,
  },
  // Optional for compatibility with existing polls created before expiries.
  expiresAt: {
    type: Date,
  },
  audienceTargets: { type: [pollAudienceTargetSchema], default: [] },
}, { timestamps: true });

const AdminPollsForm = mongoose.model("AdminPollsForm", PollsFormSchema);
export default AdminPollsForm;
