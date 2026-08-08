import express from "express";
import { createNewEvent, getAllEvent } from "../controller/event.js";

const eventRouter = express.Router();

eventRouter.get("/all-events", getAllEvent);
eventRouter.post("/new-event", createNewEvent);

export default eventRouter;
