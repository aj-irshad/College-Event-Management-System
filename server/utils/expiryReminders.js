import Event from "../model/events.js";
import Users from "../model/user.js";
import FeedbackForm from "../model/feedbackAdmin.js";
import {
  createExpiryReminder,
  TWENTY_FOUR_HOURS_MS,
} from "./bellNotification.js";
import { isEventAvailableToUser } from "./eventTargeting.js";

const FEEDBACK_TTL_MS = 48 * 60 * 60 * 1000;

const processExpiryReminders = async () => {
  const now = Date.now();
  const reminderHorizon = new Date(now + TWENTY_FOUR_HOURS_MS);

  const events = await Event.find({
    end_at: { $gt: new Date(now), $lte: reminderHorizon },
  }).select("title end_at audienceTargets");

  for (const event of events) {
    try {
      const targeted = Array.isArray(event.audienceTargets) && event.audienceTargets.length > 0;
      const users = await Users.find(targeted ? { role: "user" } : {})
        .select("_id role department semester")
        .lean();
      const recipientIds = users
        .filter((user) => isEventAvailableToUser(event, user))
        .map((user) => user._id);
      await createExpiryReminder(
        "Event ending soon",
        `"${event.title}" will end in less than 24 hours.`,
        "event",
        event._id,
        recipientIds,
      );
    } catch (error) {
      console.error(
        `Failed to create event expiry reminder for ${event._id}:`,
        error.message,
      );
    }
  }

  const feedbackForms = await FeedbackForm.find({
    isDeleted: { $ne: true },
    $and: [
      { $or: [{ isPublished: true }, { isPublished: { $exists: false } }] },
      {
        $or: [
          { endsAt: { $gt: new Date(now), $lte: reminderHorizon } },
          {
            endsAt: { $exists: false },
            createdAt: {
              $gt: new Date(now - FEEDBACK_TTL_MS),
              $lte: new Date(now - (FEEDBACK_TTL_MS - TWENTY_FOUR_HOURS_MS)),
            },
          },
        ],
      },
    ],
  }).populate("event", "status").select("question createdAt endsAt isPublished event");

  for (const form of feedbackForms) {
    if (form.event?.status !== "Completed") continue;
    try {
      await createExpiryReminder(
        "Feedback form closing soon",
        "A feedback form will expire in less than 24 hours.",
        "feedback",
        form._id,
      );
    } catch (error) {
      console.error(
        `Failed to create feedback expiry reminder for ${form._id}:`,
        error.message,
      );
    }
  }
};

export default processExpiryReminders;
