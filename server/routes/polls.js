import express from "express";
import {
  createPolls,
  fetchPollForm,
  getAllPollResults,
  getPublicPollResults,
  getPollVotesAdmin,
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
pollRouter.get("/admin/:pollId/votes", authMiddleware, adminMiddleware, getPollVotesAdmin);
pollRouter.get("/public-results", authMiddleware, getPublicPollResults);
pollRouter.delete(
  "/delete/:pollId",
  authMiddleware,
  adminMiddleware,
  deletePoll,
);
pollRouter.put("/update/:pollId", authMiddleware, adminMiddleware, updatePoll);
export default pollRouter;
