import mongoose from "mongoose";

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
});

const AdminPollsForm = mongoose.model("AdminPollsForm", PollsFormSchema);
export default AdminPollsForm;
