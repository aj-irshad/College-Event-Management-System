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
});

const AdminPollsForm = mongoose.model("AdminPollsForm", PollsFormSchema);
export default AdminPollsForm;
