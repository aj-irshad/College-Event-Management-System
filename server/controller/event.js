import mongoose from "mongoose";
import Event from "../model/events.js";
import Users from "../model/user.js";
import { emitEventToAudience } from "../socket.js";
import { getEventStatus } from "../services/eventStatusService.js";
import { refreshEventStatusSchedule } from "./eventStatusJob.js";
import sendEventNotifications from "../utils/eventNotifications.js";
import createNotification, {
  maybeCreateEventExpiryReminder,
} from "../utils/bellNotification.js";
import { EVENT_DEPARTMENTS, EVENT_SEMESTERS, isEventAvailableToUser } from "../utils/eventTargeting.js";

const EVENT_FIELDS = [
  "title",
  "description",
  "event_type",
  "department",
  "start_at",
  "end_at",
  "venue",
  "price",
  "audienceTargets",
];
const DATE_FIELDS = ["start_at", "end_at"];
const REQUIRED_TEXT_FIELDS = ["title", "description", "event_type", "venue"];
const isDebugEventSocket = () => process.env.DEBUG_EVENT_SOCKET === "true";

const isValidId = (id) => /^[a-f\d]{24}$/i.test(id);
const emitEvent = (eventName, payload, event, previousEvent) => {
  try {
    emitEventToAudience(eventName, payload, event, previousEvent);
    if (isDebugEventSocket()) {
      console.info("[event-socket] emitted", {
        pid: process.pid,
        eventName,
        eventId: String(payload?._id ?? ""),
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

  if (Object.hasOwn(data, "audienceTargets")) {
    if (!Array.isArray(data.audienceTargets)) {
      return { error: "Audience targets must be a list" };
    }
    const seenDepartments = new Set();
    for (const target of data.audienceTargets) {
      if (!target || typeof target !== "object" || Array.isArray(target)) {
        return { error: "Each audience target must include a department and semesters" };
      }
      if (!EVENT_DEPARTMENTS.includes(target.department)) {
        return { error: "Audience target contains an invalid department" };
      }
      if (seenDepartments.has(target.department)) {
        return { error: "Audience target departments cannot be duplicated" };
      }
      seenDepartments.add(target.department);
      if (!Array.isArray(target.semesters) || target.semesters.length === 0) {
        return { error: "Select at least one semester for every targeted department" };
      }
      const seenSemesters = new Set();
      for (const semester of target.semesters) {
        if (!EVENT_SEMESTERS.includes(semester)) {
          return { error: "Audience target contains an invalid semester" };
        }
        if (seenSemesters.has(semester)) {
          return { error: "Audience target semesters cannot be duplicated" };
        }
        seenSemesters.add(semester);
      }
      target.semesters = [...seenSemesters];
    }
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
    const [events, user] = await Promise.all([
      Event.find().sort({ start_at: -1, _id: -1 }),
      Users.findById(req.userId).select("role department semester"),
    ]);
    if (!user) return res.status(401).json({ success: false, message: "Please login" });
    return res.status(200).json(
      user.role === "admin" ? events : events.filter((event) => isEventAvailableToUser(event, user)),
    );
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
    const [event, user] = await Promise.all([
      Event.findById(eventId),
      Users.findById(req.userId).select("role department semester"),
    ]);
    if (!user) return res.status(401).json({ success: false, message: "Please login" });
    if (!event) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }
    if (!isEventAvailableToUser(event, user)) {
      return res.status(403).json({ success: false, message: "This event is not available to your department and semester" });
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

    emitEvent("events:created", createdEvent, createdEvent);
    refreshStatusSchedule();
    setImmediate(async () => {
      try {
        const recipients = await getEventRecipients(createdEvent);
        const recipientIds = recipients.map(({ _id }) => _id);
        void sendEventNotifications(createdEvent, recipients);
        void createNotification(
          "New Event Added!",
          `A new event "${createdEvent.title}" has been published.`,
          "event",
          createdEvent._id,
          { recipientIds },
        ).catch((err) => console.error("Background notification error:", err.message));
        void maybeCreateEventExpiryReminder(createdEvent, recipientIds).catch((err) =>
          console.error("Background expiry reminder error:", err.message),
        );
      } catch (err) {
        console.error("Could not determine event notification recipients:", err.message);
      }
    });

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

const getEventRecipients = async (event) => {
  const users = await Users.find(
    Array.isArray(event.audienceTargets) && event.audienceTargets.length > 0
      ? { role: "user" }
      : {},
  ).select("_id email department semester").lean();
  return users.filter((user) => isEventAvailableToUser(event, user));
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

    emitEvent("events:deleted", { _id: deletedEvent._id }, null, deletedEvent);
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

    const previousEvent = existing.toObject();
    Object.assign(existing, eventData);
    const updatedEvent = await existing.save();
    emitEvent("events:updated", updatedEvent, updatedEvent, previousEvent);
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
