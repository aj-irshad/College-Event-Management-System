import Event from "../model/events.js";
import FeedbackForm from "../model/feedbackAdmin.js";
import {
  createExpiryReminder,
  TWENTY_FOUR_HOURS_MS,
} from "./bellNotification.js";

const FEEDBACK_TTL_MS = 48 * 60 * 60 * 1000;

const processExpiryReminders = async () => {
  const now = Date.now();
  const reminderHorizon = new Date(now + TWENTY_FOUR_HOURS_MS);

  const events = await Event.find({
    end_at: { $gt: new Date(now), $lte: reminderHorizon },
  }).select("title end_at");

  for (const event of events) {
    try {
      await createExpiryReminder(
        "Event ending soon",
        `"${event.title}" will end in less than 24 hours.`,
        "event",
        event._id,
      );
    } catch (error) {
      console.error(
        `Failed to create event expiry reminder for ${event._id}:`,
        error.message,
      );
    }
  }

  const feedbackNotExpiredAfter = new Date(now - FEEDBACK_TTL_MS);
  const feedbackReminderDueBy = new Date(now - (FEEDBACK_TTL_MS - TWENTY_FOUR_HOURS_MS));

  const feedbackForms = await FeedbackForm.find({
    createdAt: {
      $gt: feedbackNotExpiredAfter,
      $lte: feedbackReminderDueBy,
    },
  }).select("question createdAt");

  for (const form of feedbackForms) {
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
