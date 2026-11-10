import mongoose from "mongoose";
import { EVENT_DEPARTMENTS, EVENT_SEMESTERS } from "../utils/eventTargeting.js";

const audienceTargetSchema = new mongoose.Schema(
  {
    department: { type: String, enum: EVENT_DEPARTMENTS, required: true },
    semesters: [{ type: String, enum: EVENT_SEMESTERS, required: true }],
  },
  { _id: false },
);

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
      trim: true,
    },
    department: {
      type: String,
      trim: true,
      default: "",
    },
    audienceTargets: {
      type: [audienceTargetSchema],
      default: [],
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
      min: 0,
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
