import mongoose from "mongoose";
import { EVENT_DEPARTMENTS, EVENT_SEMESTERS } from "../utils/eventTargeting.js";

const audienceTargetSchema = new mongoose.Schema(
  {
    department: { type: String, enum: EVENT_DEPARTMENTS, required: true },
    semesters: [{ type: String, enum: EVENT_SEMESTERS, required: true }],
  },
  { _id: false },
);

const eventAttachmentSchema = new mongoose.Schema(
  {
    originalFilename: { type: String, required: true, trim: true, maxlength: 180 },
    secureUrl: { type: String, required: true },
    publicId: { type: String, required: true, trim: true },
    resourceType: { type: String, enum: ["image", "raw"], required: true },
    mimeType: { type: String, required: true, trim: true },
    format: { type: String, required: true, trim: true },
    size: { type: Number, required: true, min: 1, max: 5 * 1024 * 1024 },
  },
  { timestamps: true },
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
    attachments: {
      type: [eventAttachmentSchema],
      default: [],
      validate: {
        validator: (attachments) => attachments.length <= 5,
        message: "An event can have at most 5 attachments",
      },
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
