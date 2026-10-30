import mongoose from "mongoose";
import Notification from "../model/notification.js";

const isReadByUser = (readBy, userId) =>
  Array.isArray(readBy) &&
  readBy.some((id) => String(id) === String(userId));

const formatNotification = (notif, userId) => ({
  _id: notif._id,
  title: notif.title,
  message: notif.message,
  type: notif.type,
  linkId: notif.linkId ?? null,
  createdAt: notif.createdAt,
  read: isReadByUser(notif.readBy, userId),
});

const getRecentNotifications = async (req, res) => {
  try {
    const userId = req.userId;
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const notifications = await Notification.find({
      createdAt: { $gte: fiveDaysAgo },
    }).sort({ createdAt: -1 });

    const formattedNotifications = notifications.map((notif) =>
      formatNotification(notif, userId),
    );

    res.status(200).json(formattedNotifications);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch notifications", error: error.message });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const userId = req.userId;
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);

    await Notification.updateMany(
      { createdAt: { $gte: fiveDaysAgo }, readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } },
    );

    res.status(200).json({ message: "All marked as read" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update notifications",
      error: error.message,
    });
  }
};

const markOneAsRead = async (req, res) => {
  try {
    const userId = req.userId;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid notification id" });
    }

    const notification = await Notification.findByIdAndUpdate(
      id,
      { $addToSet: { readBy: userId } },
      { new: true },
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.status(200).json({
      message: "Notification marked as read",
      notification: formatNotification(notification, userId),
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update notification",
      error: error.message,
    });
  }
};

export { getRecentNotifications, markAllAsRead, markOneAsRead };
