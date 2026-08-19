import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    event_type: {
      type: String,
      required: true,
    },
    start_at: {
      type: Date,
      required: true,
    },
    venue: {
      type: String,
      required: true,
    },
    end_at: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["Ongoing", "Upcoming", "Completed"],
      default: "Upcoming",
    },
    eventDate: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true },
);

const Event = mongoose.model("Event", eventSchema);

export default Event;
