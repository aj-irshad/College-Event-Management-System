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
import { deleteFromCloudinary, readCloudinaryAsset, uploadToCloudinary } from "../utils/cloudinary.js";

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
const MAX_EVENT_ATTACHMENTS = 5;
const EVENT_ATTACHMENT_FOLDER_PREFIX = "ems/event-attachments/";
const isDebugEventSocket = () => process.env.DEBUG_EVENT_SOCKET === "true";

const isValidId = (id) => /^[a-f\d]{24}$/i.test(id);
const toEventClientPayload = (event) => {
  const value = event?.toObject ? event.toObject() : event;
  if (!value) return value;
  const eventId = String(value._id);
  return {
    ...value,
    attachments: (value.attachments || []).map((attachment) => ({
      _id: String(attachment._id),
      originalFilename: attachment.originalFilename,
      mimeType: attachment.mimeType,
      format: attachment.format,
      size: attachment.size,
      url: `/events/attachment/${eventId}/${attachment._id}`,
    })),
  };
};

const parseEventRequest = (req) => {
  const body = req.body || {};
  let eventData = body;
  if (Object.hasOwn(body, "eventData")) {
    try {
      eventData = typeof body.eventData === "string" ? JSON.parse(body.eventData) : body.eventData;
    } catch {
      return { error: "Event data must be valid JSON" };
    }
    if (!eventData || typeof eventData !== "object" || Array.isArray(eventData)) {
      return { error: "Event data must be an object" };
    }
  }

  let removeAttachmentIds = [];
  if (Object.hasOwn(body, "removeAttachmentIds")) {
    try {
      removeAttachmentIds = typeof body.removeAttachmentIds === "string"
        ? JSON.parse(body.removeAttachmentIds)
        : body.removeAttachmentIds;
    } catch {
      return { error: "Attachment removals must be a valid list" };
    }
    if (!Array.isArray(removeAttachmentIds) || removeAttachmentIds.some((id) => !isValidId(id))) {
      return { error: "Attachment removals must contain valid attachment IDs" };
    }
    if (new Set(removeAttachmentIds.map(String)).size !== removeAttachmentIds.length) {
      return { error: "Attachment removals cannot contain duplicate IDs" };
    }
  }
  return { eventData, removeAttachmentIds };
};

const isManagedEventAttachment = (attachment) =>
  typeof attachment?.publicId === "string" &&
  attachment.publicId.startsWith(EVENT_ATTACHMENT_FOLDER_PREFIX) &&
  ["image", "raw"].includes(attachment.resourceType);

const safelyDeleteEventAttachment = async (attachment) => {
  if (!isManagedEventAttachment(attachment)) {
    console.error("Skipped deletion for an event attachment outside its managed Cloudinary folder");
    return;
  }
  try {
    const referenced = await Event.exists({ "attachments.publicId": attachment.publicId });
    if (referenced) return;
  } catch {
    console.error("Could not verify event attachment references; retained Cloudinary asset");
    return;
  }
  try {
    await deleteFromCloudinary(attachment.publicId, attachment.resourceType);
  } catch (error) {
    console.error("Could not delete an unused event attachment from Cloudinary", error.code || "CLOUDINARY_ERROR");
  }
};

const cleanupEventAttachments = async (attachments = []) => {
  await Promise.all(attachments.map(safelyDeleteEventAttachment));
};

const uploadEventFiles = async (files = []) => {
  const uploaded = [];
  try {
    for (const file of files) {
      const result = await uploadToCloudinary(file.path, "event-attachments", {
        resourceType: file.eventAttachmentResourceType,
      });
      uploaded.push({
        originalFilename: file.originalname,
        secureUrl: result.url,
        publicId: result.publicId,
        resourceType: result.resourceType,
        mimeType: file.eventAttachmentMimeType,
        format: file.eventAttachmentFormat,
        size: file.size,
      });
    }
    return uploaded;
  } catch (error) {
    await cleanupEventAttachments(uploaded);
    throw error;
  }
};

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
      Event.find().sort({ start_at: 1, _id: 1 }),
      Users.findById(req.userId).select("role department semester"),
    ]);
    if (!user) return res.status(401).json({ success: false, message: "Please login" });
    return res.status(200).json(
      (user.role === "admin" ? events : events.filter((event) => isEventAvailableToUser(event, user)))
        .map(toEventClientPayload),
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
    return res.status(200).json(toEventClientPayload(event));
  } catch (error) {
    console.error("Failed to fetch event:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch event" });
  }
};

const getEventAttachment = async (req, res) => {
  const { eventId, attachmentId } = req.params;
  if (!isValidId(eventId) || !isValidId(attachmentId)) {
    return res.status(400).json({ success: false, message: "Invalid event or attachment ID" });
  }

  try {
    const [event, user] = await Promise.all([
      Event.findById(eventId),
      Users.findById(req.userId).select("role department semester"),
    ]);
    if (!user) return res.status(401).json({ success: false, message: "Please login" });
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });
    if (!isEventAvailableToUser(event, user)) {
      return res.status(403).json({ success: false, message: "This event is not available to your account" });
    }

    const attachment = event.attachments.id(attachmentId);
    if (!attachment || !isManagedEventAttachment(attachment)) {
      return res.status(404).json({ success: false, message: "Event attachment not found" });
    }
    const content = await readCloudinaryAsset(attachment.secureUrl, attachment.resourceType);
    const filename = String(attachment.originalFilename || "event-attachment").replace(/[\r\n"\\]/g, "_");
    const disposition = req.query.download === "1" ? "attachment" : "inline";
    res.set({
      "Content-Type": attachment.mimeType,
      "Content-Length": String(content.length),
      "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    });
    return res.status(200).send(content);
  } catch (error) {
    console.error("Failed to retrieve event attachment:", error.code || error.message);
    return res.status(502).json({ success: false, message: "Could not retrieve this event attachment" });
  }
};

const createNewEvent = async (req, res) => {
  const parsed = parseEventRequest(req);
  if (parsed.error) return res.status(400).json({ success: false, message: parsed.error });
  const { eventData, error } = validateEventData(parsed.eventData || {});
  if (error) return res.status(400).json({ success: false, message: error });
  if (parsed.removeAttachmentIds.length) {
    return res.status(400).json({ success: false, message: "New events cannot remove existing attachments" });
  }
  if ((req.files || []).length > MAX_EVENT_ATTACHMENTS) {
    return res.status(400).json({ success: false, message: "An event can have at most 5 attachments" });
  }

  let uploadedAttachments = [];
  try {
    uploadedAttachments = await uploadEventFiles(req.files || []);
    eventData.attachments = uploadedAttachments;
    eventData.status = getEventStatus(eventData.start_at, eventData.end_at);
    const createdEvent = await Event.create(eventData);

    emitEvent("events:created", toEventClientPayload(createdEvent), createdEvent);
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
      event: toEventClientPayload(createdEvent),
    });
  } catch (error) {
    await cleanupEventAttachments(uploadedAttachments);
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
    await cleanupEventAttachments(deletedEvent.attachments || []);
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

  let uploadedAttachments = [];
  try {
    const existing = await Event.findById(eventId);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const parsed = parseEventRequest(req);
    if (parsed.error) return res.status(400).json({ success: false, message: parsed.error });
    const { eventData, error } = validateEventData(parsed.eventData || {}, {
      partial: true,
      existing,
    });
    if (error) return res.status(400).json({ success: false, message: error });
    const currentAttachments = existing.attachments || [];
    const currentIds = new Set(currentAttachments.map((attachment) => String(attachment._id)));
    if (parsed.removeAttachmentIds.some((id) => !currentIds.has(String(id)))) {
      return res.status(400).json({ success: false, message: "One or more attachments do not belong to this event" });
    }
    const removedIds = new Set(parsed.removeAttachmentIds.map(String));
    const removedAttachments = currentAttachments.filter((attachment) => removedIds.has(String(attachment._id)));
    const remainingAttachments = currentAttachments.filter((attachment) => !removedIds.has(String(attachment._id)));
    const files = req.files || [];
    if (remainingAttachments.length + files.length > MAX_EVENT_ATTACHMENTS) {
      return res.status(400).json({ success: false, message: "An event can have at most 5 attachments" });
    }
    const attachmentsChanged = removedAttachments.length > 0 || files.length > 0;
    if (Object.keys(eventData).length === 0 && !attachmentsChanged) {
      return res.status(400).json({ success: false, message: "No event fields provided" });
    }

    uploadedAttachments = await uploadEventFiles(files);
    if (attachmentsChanged) eventData.attachments = [...remainingAttachments, ...uploadedAttachments];
    const start = eventData.start_at ?? existing.start_at;
    const end = eventData.end_at ?? existing.end_at;
    eventData.status = getEventStatus(start, end);

    const previousEvent = existing.toObject();
    Object.assign(existing, eventData);
    const updatedEvent = await existing.save();
    emitEvent("events:updated", toEventClientPayload(updatedEvent), updatedEvent, previousEvent);
    refreshStatusSchedule();
    await cleanupEventAttachments(removedAttachments);

    return res.status(200).json({
      success: true,
      message: "Event updated successfully",
      event: toEventClientPayload(updatedEvent),
    });
  } catch (error) {
    await cleanupEventAttachments(uploadedAttachments);
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error("Failed to update event:", error.message);
    return res.status(500).json({ success: false, message: "Failed to update event" });
  }
};

export { createNewEvent, getAllEvent, getEventById, getEventAttachment, deleteEvent, updateEvent };
