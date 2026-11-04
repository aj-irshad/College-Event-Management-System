import mongoose from "mongoose";
import Event from "../model/events.js";
import { getIO } from "../socket.js";
import { getEventStatus } from "../services/eventStatusService.js";
import { refreshEventStatusSchedule } from "./eventStatusJob.js";
import sendEventNotifications from "../utils/eventNotifications.js";
import createNotification, {
  maybeCreateEventExpiryReminder,
} from "../utils/bellNotification.js";

const EVENT_FIELDS = [
  "title",
  "description",
  "event_type",
  "department",
  "start_at",
  "end_at",
  "venue",
  "price",
];
const DATE_FIELDS = ["start_at", "end_at"];
const REQUIRED_TEXT_FIELDS = ["title", "description", "event_type", "venue"];
const isDebugEventSocket = () => process.env.DEBUG_EVENT_SOCKET === "true";

const isValidId = (id) => /^[a-f\d]{24}$/i.test(id);
const emitEvent = (eventName, payload) => {
  try {
    const io = getIO();
    io.to("events").emit(eventName, payload);
    if (isDebugEventSocket()) {
      void io
        .in("events")
        .allSockets()
        .then((roomMembers) => {
          console.info("[event-socket] emitted", {
            pid: process.pid,
            eventName,
            eventId: String(payload?._id ?? ""),
            roomSize: roomMembers.size,
          });
        })
        .catch((error) => {
          console.info("[event-socket] room count unavailable", error.message);
        });
    }
  } catch (error) {
    console.error(`Failed to emit ${eventName}:`, error.message);
  }
};

const refreshStatusSchedule = () => {
  void refreshEventStatusSchedule().catch((error) => {
    console.error("Failed to reschedule event status transitions:", error.message);
  });
};

const validateEventData = (data, { partial = false, existing = {} } = {}) => {
  const eventData = {};

  for (const field of EVENT_FIELDS) {
    if (Object.hasOwn(data, field)) eventData[field] = data[field];
  }

  if (!partial) {
    const missing = REQUIRED_TEXT_FIELDS.filter(
      (field) => typeof eventData[field] !== "string" || !eventData[field].trim(),
    );
    if (missing.length) {
      return { error: `Required event fields are missing: ${missing.join(", ")}` };
    }
    for (const field of DATE_FIELDS) {
      if (!Object.hasOwn(eventData, field)) {
        return { error: `${field} is required` };
      }
    }
  }

  for (const field of [...REQUIRED_TEXT_FIELDS, "department"]) {
    if (!Object.hasOwn(eventData, field)) continue;
    if (typeof eventData[field] !== "string") {
      return { error: `${field} must be text` };
    }
    eventData[field] = eventData[field].trim();
    if (REQUIRED_TEXT_FIELDS.includes(field) && !eventData[field]) {
      return { error: `${field} cannot be empty` };
    }
  }

  for (const field of DATE_FIELDS) {
    if (!Object.hasOwn(eventData, field)) continue;
    const date = new Date(eventData[field]);
    if (Number.isNaN(date.getTime())) return { error: `${field} must be a valid date` };
    eventData[field] = date;
  }

  const start = eventData.start_at ?? existing.start_at;
  const end = eventData.end_at ?? existing.end_at;
  if (start && end && new Date(end) <= new Date(start)) {
    return { error: "Event end date and time must be after the start date and time" };
  }

  if (Object.hasOwn(eventData, "price")) {
    if (
      (typeof eventData.price !== "number" && typeof eventData.price !== "string") ||
      (typeof eventData.price === "string" && !eventData.price.trim())
    ) {
      return { error: "Event price must be a non-negative number" };
    }
    const price = Number(eventData.price);
    if (!Number.isFinite(price) || price < 0) {
      return { error: "Event price must be a non-negative number" };
    }
    eventData.price = price;
  } else if (!partial) {
    eventData.price = 0;
  }

  return { eventData };
};

const getAllEvent = async (req, res) => {
  try {
    const events = await Event.find().sort({ start_at: -1, _id: -1 });
    return res.status(200).json(events);
  } catch (error) {
    console.error("Failed to fetch events:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch events" });
  }
};

const getEventById = async (req, res) => {
  const { eventId } = req.params;
  if (!isValidId(eventId)) {
    return res.status(400).json({ success: false, message: "Invalid event ID" });
  }

  try {
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }
    return res.status(200).json(event);
  } catch (error) {
    console.error("Failed to fetch event:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch event" });
  }
};

const createNewEvent = async (req, res) => {
  const { eventData, error } = validateEventData(req.body || {});
  if (error) return res.status(400).json({ success: false, message: error });

  try {
    eventData.status = getEventStatus(eventData.start_at, eventData.end_at);
    const createdEvent = await Event.create(eventData);

    emitEvent("events:created", createdEvent);
    refreshStatusSchedule();
    setImmediate(() => void sendEventNotifications(createdEvent));

    createNotification(
      "New Event Added!",
      `A new event "${createdEvent.title}" has been published.`,
      "event",
      createdEvent._id,
    ).catch((err) => console.error("Background notification error:", err.message));

    maybeCreateEventExpiryReminder(createdEvent).catch((err) =>
      console.error("Background expiry reminder error:", err.message),
    );

    return res.status(201).json({
      success: true,
      message: "Successfully created new event",
      event: createdEvent,
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error("Error creating event:", error.message);
    return res.status(500).json({ success: false, message: "Error creating new event" });
  }
};

const deleteEvent = async (req, res) => {
  const { eventId } = req.params;
  if (!isValidId(eventId)) {
    return res.status(400).json({ success: false, message: "Invalid event ID" });
  }

  try {
    const deletedEvent = await Event.findByIdAndDelete(eventId);
    if (!deletedEvent) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    emitEvent("events:deleted", { _id: deletedEvent._id });
    refreshStatusSchedule();
    return res.status(200).json({
      success: true,
      message: "Event deleted successfully",
      eventId: deletedEvent._id,
    });
  } catch (error) {
    console.error("Failed to delete event:", error.message);
    return res.status(500).json({ success: false, message: "Failed to delete event" });
  }
};

const updateEvent = async (req, res) => {
  const { eventId } = req.params;
  if (!isValidId(eventId)) {
    return res.status(400).json({ success: false, message: "Invalid event ID" });
  }

  try {
    const existing = await Event.findById(eventId);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const { eventData, error } = validateEventData(req.body || {}, {
      partial: true,
      existing,
    });
    if (error) return res.status(400).json({ success: false, message: error });
    if (Object.keys(eventData).length === 0) {
      return res.status(400).json({ success: false, message: "No event fields provided" });
    }

    const start = eventData.start_at ?? existing.start_at;
    const end = eventData.end_at ?? existing.end_at;
    eventData.status = getEventStatus(start, end);

    Object.assign(existing, eventData);
    const updatedEvent = await existing.save();
    emitEvent("events:updated", updatedEvent);
    refreshStatusSchedule();

    return res.status(200).json({
      success: true,
      message: "Event updated successfully",
      event: updatedEvent,
    });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error("Failed to update event:", error.message);
    return res.status(500).json({ success: false, message: "Failed to update event" });
  }
};

export { createNewEvent, getAllEvent, getEventById, deleteEvent, updateEvent };
