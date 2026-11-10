import express from "express";
import {
  getRecentNotifications,
  markAllAsRead,
  markOneAsRead,
} from "../controller/notification.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { subscribePushDevice, unsubscribePushDevice } from "../controller/pushSubscription.js";

const notificationRouter = express.Router();

notificationRouter.get("/", authMiddleware, getRecentNotifications);
notificationRouter.put("/mark-read", authMiddleware, markAllAsRead);
notificationRouter.patch("/:id/read", authMiddleware, markOneAsRead);
notificationRouter.post("/push-subscription", authMiddleware, subscribePushDevice);
notificationRouter.delete("/push-subscription", authMiddleware, unsubscribePushDevice);

export default notificationRouter;
