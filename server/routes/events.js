import express from "express";
import {
  createNewEvent,
  getAllEvent,
  getEventById,
  getEventAttachment,
  deleteEvent,
  updateEvent,
} from "../controller/event.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";
import { uploadEventAttachments } from "../middleware/multerUpload.js";

const eventRouter = express.Router();

eventRouter.get("/get-events", authMiddleware, getAllEvent);
eventRouter.get("/attachment/:eventId/:attachmentId", authMiddleware, getEventAttachment);
eventRouter.get("/:eventId", authMiddleware, getEventById);
eventRouter.post("/new-event", authMiddleware, adminMiddleware, uploadEventAttachments, createNewEvent);
eventRouter.delete(
  "/delete-event/:eventId",
  authMiddleware,
  adminMiddleware,
  deleteEvent,
);
eventRouter.patch(
  "/edit-event/:eventId",
  authMiddleware,
  adminMiddleware,
  uploadEventAttachments,
  updateEvent,
);
export default eventRouter;
