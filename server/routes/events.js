import express from "express";
import {
  createNewEvent,
  getAllEvent,
  deleteEvent,
  updateEvent,
} from "../controller/event.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const eventRouter = express.Router();

eventRouter.get("/get-events", getAllEvent);
eventRouter.post("/new-event", authMiddleware, adminMiddleware, createNewEvent);
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
  updateEvent,
);

export default eventRouter;
