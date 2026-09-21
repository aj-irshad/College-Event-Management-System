import express from "express";
import {
  createPolls,
  fetchPollForm,
  getAllPollResults,
  getUserVotes,
  submitPollVote,
  deletePoll,
  updatePoll,
} from "../controller/polls.js";

import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";

const pollRouter = express.Router();

pollRouter.post("/create-poll", authMiddleware, adminMiddleware, createPolls);
pollRouter.get("/fetch-pollForms", authMiddleware, fetchPollForm);
pollRouter.post("/user-vote", authMiddleware, submitPollVote);
pollRouter.get("/votes", authMiddleware, getUserVotes);
pollRouter.get("/results", authMiddleware, adminMiddleware, getAllPollResults);
pollRouter.delete(
  "/delete/:pollId",
  authMiddleware,
  adminMiddleware,
  deletePoll,
);
pollRouter.put("/update/:pollId", authMiddleware, adminMiddleware, updatePoll);
export default pollRouter;
