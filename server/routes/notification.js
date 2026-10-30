import express from "express";
import {
  getRecentNotifications,
  markAllAsRead,
  markOneAsRead,
} from "../controller/notification.js";
import authMiddleware from "../middleware/authMiddleware.js";

const notificationRouter = express.Router();

notificationRouter.get("/", authMiddleware, getRecentNotifications);
notificationRouter.put("/mark-read", authMiddleware, markAllAsRead);
notificationRouter.patch("/:id/read", authMiddleware, markOneAsRead);

export default notificationRouter;
