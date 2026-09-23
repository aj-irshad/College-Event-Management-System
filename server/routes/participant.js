import express from "express";

import {
  participateInEvent,
  getMyParticipation,
} from "../controller/participant.js";

import authMiddleware from "../middleware/authMiddleware.js";

const participantRouter = express.Router();

// PARTICIPATE IN EVENT
participantRouter.post("/participate", authMiddleware, participateInEvent);

// USER GETS TO KNOW ABOUT THEIR PARTICIPATION IN AN EVENT
participantRouter.get("/my-participation", authMiddleware, getMyParticipation);

export default participantRouter;
