import Notification from "../model/notification.js";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

const isDuplicateKeyError = (error) => error?.code === 11000;

const createNotification = async (title, message, type, linkId = null) => {
  try {
    return await Notification.create({
      title,
      message,
      type,
      linkId,
      isExpiryReminder: false,
    });
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
};

const createExpiryReminder = async (title, message, type, linkId) => {
  if (!linkId) {
    return null;
  }

  const existing = await Notification.findOne({
    type,
    linkId,
    isExpiryReminder: true,
  });

  if (existing) {
    return existing;
  }

  try {
    return await Notification.create({
      title,
      message,
      type,
      linkId,
      isExpiryReminder: true,
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return Notification.findOne({
        type,
        linkId,
        isExpiryReminder: true,
      });
    }

    console.error("Error creating expiry reminder:", error);
    throw error;
  }
};

const isWithinExpiryReminderWindow = (expiresAt, now = new Date()) => {
  const expiry = new Date(expiresAt).getTime();
  const current = new Date(now).getTime();

  if (!(expiry > current)) {
    return false;
  }

  return expiry - current <= TWENTY_FOUR_HOURS_MS;
};

const maybeCreateEventExpiryReminder = async (event) => {
  if (!event?.end_at || !isWithinExpiryReminderWindow(event.end_at)) {
    return null;
  }

  return createExpiryReminder(
    "Event ending soon",
    `"${event.title}" will end in less than 24 hours.`,
    "event",
    event._id,
  );
};

export {
  createExpiryReminder,
  isWithinExpiryReminderWindow,
  maybeCreateEventExpiryReminder,
  TWENTY_FOUR_HOURS_MS,
};

export default createNotification;
