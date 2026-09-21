import mongoose from "mongoose";

const pollVoteSchema = new mongoose.Schema(
  {
    poll: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminPollsForm",
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Users",
      required: true,
    },

    selectedOption: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// One user can vote only once in one poll
pollVoteSchema.index({ poll: 1, user: 1 }, { unique: true });

const PollVote = mongoose.model("PollVote", pollVoteSchema);

export default PollVote;
