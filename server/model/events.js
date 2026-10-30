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
    price: {
      type: Number,
      required: true,
      default: 0, // Defaults to 0 for Free Admission events
    },
    status: {
      type: String,
      enum: ["Ongoing", "Upcoming", "Completed"],
      default: "Upcoming",
    },
    eventDate: {
      type: Date,
    },
  },
  { timestamps: true },
);

const Event = mongoose.model("Event", eventSchema);

export default Event;
