import Notification from "../model/notification.js";
import Users from "../model/user.js";
import { getIO } from "../socket.js";
import sendPushNotification from "./webPush.js";

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const isDuplicateKeyError = (error) => error?.code === 11000;

export const createNotification = async (title, message, type, linkId, options = {}) => {
  const recipients = Array.isArray(options.recipientIds)
    ? await Users.find({ _id: { $in: options.recipientIds } }).select("_id").lean()
    : await Users.find({}).select("_id").lean();
  if (!recipients.length) return [];
  const ops = recipients.map(({ _id }) => ({
    updateOne: {
      filter: { recipient: _id, type, linkId, isExpiryReminder: { $ne: true } },
      update: { $setOnInsert: { recipient: _id, title, message, type, linkId, read: false, isExpiryReminder: false } },
      upsert: true,
    },
  }));
  const result = await Notification.bulkWrite(ops, { ordered: false });
  const records = await Notification.find({
    type,
    linkId,
    recipient: { $in: recipients.map(({ _id }) => _id) },
    isExpiryReminder: { $ne: true },
  }).lean();
  const insertedIds = Object.values(result.upsertedIds || {});
  const insertedIdSet = new Set(insertedIds.map(String));
  const newlyCreated = records.filter((item) => insertedIdSet.has(String(item._id)));
  try {
    const io = getIO();
    for (const item of records) {
      io.to(`user:${item.recipient}`).emit("notification:new", {
        _id: item._id, title: item.title, message: item.message, type: item.type,
        linkId: item.linkId, read: item.read, createdAt: item.createdAt,
      });
    }
  } catch (error) {
    console.error("Failed to emit in-app notifications:", error.message);
  }
  for (const item of newlyCreated) {
    void sendPushNotification(item);
  }
  return records;
};

const emitReminder = (notification) => {
  getIO().to(`user:${notification.recipient}`).emit("notification:new", {
    _id: notification._id,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    linkId: notification.linkId,
    read: notification.read,
    createdAt: notification.createdAt,
  });
};

const createExpiryReminder = async (title, message, type, linkId, recipientIds) => {
  if (!linkId) return [];

  const recipients = Array.isArray(recipientIds)
    ? await Users.find({ _id: { $in: recipientIds } }).select("_id").lean()
    : await Users.find({}).select("_id").lean();
  const created = [];
  for (const { _id: recipient } of recipients) {
    try {
      const notification = await Notification.create({
        recipient,
        title,
        message,
        type,
        linkId,
        read: false,
        isExpiryReminder: true,
      });
      created.push(notification);
      try {
        emitReminder(notification);
      } catch (error) {
        console.error("Failed to emit expiry reminder:", error.message);
      }
      void sendPushNotification(notification);
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
    }
  }
  return created;
};

const isWithinExpiryReminderWindow = (expiresAt, now = new Date()) => {
  const expiry = new Date(expiresAt).getTime();
  const current = new Date(now).getTime();
  return expiry > current && expiry - current <= TWENTY_FOUR_HOURS_MS;
};

const maybeCreateEventExpiryReminder = async (event, recipientIds) => {
  if (!event?.end_at || !isWithinExpiryReminderWindow(event.end_at)) return null;
  return createExpiryReminder(
    "Event ending soon",
    `"${event.title}" will end in less than 24 hours.`,
    "event",
    event._id,
    recipientIds,
  );
};

export {
  createExpiryReminder,
  isWithinExpiryReminderWindow,
  maybeCreateEventExpiryReminder,
  TWENTY_FOUR_HOURS_MS,
};
export default createNotification;
