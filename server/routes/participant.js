import express from "express";

import {
  participateInEvent,
  getMyParticipation,
  getAllParticipantsAdmin,
  updateParticipationApproval,
} from "../controller/participant.js";

import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const participantRouter = express.Router();

// PARTICIPATE IN EVENT
participantRouter.post("/participate", authMiddleware, participateInEvent);

// USER GETS TO KNOW ABOUT THEIR PARTICIPATION IN AN EVENT
participantRouter.get("/my-participation", authMiddleware, getMyParticipation);
participantRouter.get(
  "/admin/all",
  authMiddleware,
  adminMiddleware,
  getAllParticipantsAdmin,
);
participantRouter.patch(
  "/admin/:id/approval",
  authMiddleware,
  adminMiddleware,
  updateParticipationApproval,
);

export default participantRouter;
