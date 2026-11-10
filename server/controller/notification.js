import mongoose from "mongoose";
import Notification from "../model/notification.js";
import { getIO } from "../socket.js";

const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
const getRetentionCutoff = () => new Date(Date.now() - FIVE_DAYS_MS);

const getRecentNotifications = async (req, res) => {
  try {
    const cutoff = getRetentionCutoff();
    const activeRecipientFilter = { recipient: req.userId, createdAt: { $gt: cutoff } };
    const [notifications, unreadCount] = await Promise.all([
      Notification.find(activeRecipientFilter).sort({ createdAt: -1 }).limit(100).lean(),
      Notification.countDocuments({ ...activeRecipientFilter, read: false }),
    ]);
    res.status(200).json({ notifications, unreadCount });
  } catch (error) { res.status(500).json({ message: "Failed to fetch notifications" }); }
};

const markOneAsRead = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid notification id" });
  try {
    const item = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        recipient: req.userId,
        createdAt: { $gt: getRetentionCutoff() },
      },
      { read: true },
      { returnDocument: "after" },
    ).lean();
    if (!item) return res.status(404).json({ message: "Notification not found" });
    getIO().to(`user:${req.userId}`).emit("notification:read", { _id: item._id });
    res.status(200).json({ message: "Notification marked as read", notification: item });
  } catch (error) { res.status(500).json({ message: "Failed to update notification" }); }
};

const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      {
        recipient: req.userId,
        read: false,
        createdAt: { $gt: getRetentionCutoff() },
      },
      { read: true },
    );
    getIO().to(`user:${req.userId}`).emit("notification:read-all");
    res.status(200).json({ message: "All marked as read" });
  } catch (error) { res.status(500).json({ message: "Failed to update notifications" }); }
};

export { getRecentNotifications, markAllAsRead, markOneAsRead };
