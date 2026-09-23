import mongoose from "mongoose";

const participantSchema = new mongoose.Schema(
  {
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

    participationType: {
      type: String,
      enum: ["Participant", "Volunteer", "Organizing Member"],
      required: true,
    },
  },
  { timestamps: true },
);

participantSchema.index({ event: 1, user: 1 }, { unique: true });

const Participant = mongoose.model("Participant", participantSchema);

export default Participant;
