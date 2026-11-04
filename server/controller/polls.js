import AdminPollsForm from "../model/adminPolls.js";
import PollVote from "../model/UserVotes.js";
import { getIO } from "../socket.js";
import { refreshPollExpirySchedule } from "./pollExpiryJob.js";

import createNotification from "../utils/bellNotification.js";

const emitPollEvent = (eventName, payload) => {
  try {
    getIO().to("polls").emit(eventName, payload);
  } catch (error) {
    console.error(`Failed to emit ${eventName}:`, error.message);
  }
};

const getPollStatus = (expiresAt, now = Date.now()) =>
  expiresAt && new Date(expiresAt).getTime() <= now ? "Completed" : "Active";

const getPublicPoll = (poll) => ({
  _id: String(poll._id),
  question: poll.question,
  options: poll.options,
  expiresAt: poll.expiresAt || null,
  status: getPollStatus(poll.expiresAt),
});

const refreshExpirySchedule = () => {
  void refreshPollExpirySchedule().catch((error) => {
    console.error("Failed to refresh poll expiry schedule:", error.message);
  });
};

const validateExpiry = (value, { requireFuture = true } = {}) => {
  if (typeof value !== "string" || !value.trim()) {
    return { error: "A poll expiry date and time are required" };
  }
  const expiresAt = new Date(value);
  if (!Number.isFinite(expiresAt.getTime())) {
    return { error: "Poll expiry must be a valid date and time" };
  }
  if (requireFuture && expiresAt.getTime() <= Date.now()) {
    return { error: "Poll expiry must be in the future" };
  }
  return { expiresAt };
};

const buildPollResults = async () => {
  const polls = await AdminPollsForm.find().lean();
  const results = await PollVote.aggregate([
    {
      $group: {
        _id: { poll: "$poll", option: "$selectedOption" },
        votes: { $sum: 1 },
      },
    },
  ]);

  const now = Date.now();
  return polls.map((poll) => {
    const pollResults = poll.options.map((option) => {
      const result = results.find(
        (item) =>
          item._id.poll.toString() === poll._id.toString() &&
          item._id.option === option,
      );

      return { option, votes: result ? result.votes : 0 };
    });
    const totalVotes = pollResults.reduce((total, item) => total + item.votes, 0);
    const highestVotes =
      totalVotes > 0 ? Math.max(...pollResults.map((item) => item.votes)) : 0;

    return {
      ...poll,
      expiresAt: poll.expiresAt || null,
      status: getPollStatus(poll.expiresAt, now),
      results: pollResults,
      totalVotes,
      highestVotes,
    };
  });
};

// ADMIN CREATE POLL FORMS
const createPolls = async (req, res) => {
  try {
    const { question, options } = req.body;
    const { expiresAt, error } = validateExpiry(req.body?.expiresAt);
    if (error) return res.status(400).json({ message: error });
    const newPoll = await AdminPollsForm.create({
      question,
      options,
      expiresAt,
    });

    refreshExpirySchedule();
    emitPollEvent("polls:created", getPublicPoll(newPoll));

    createNotification(
      "New Campus Poll Active",
      `Cast your vote for: "${question}"`,
      "poll",
      newPoll._id,
    ).catch((err) => console.error("Background notification error:", err));

    res.status(201).json({
      message: "Poll successfully created",
    });
  } catch (err) {
    console.error("Error creating poll:", err.message);

    res.status(500).json({
      message: "Failed to create poll",
    });
  }
};

// USER FETCH POLL FORMS
const fetchPollForm = async (req, res) => {
  try {
    const polls = await AdminPollsForm.find().sort({ _id: -1 }).lean();
    const now = Date.now();
    res.status(200).json(
      polls.map((poll) => ({
        ...poll,
        expiresAt: poll.expiresAt || null,
        status: getPollStatus(poll.expiresAt, now),
      })),
    );
  } catch (err) {
    console.error("Error fetching polls:", err.message);
    res.status(500).json({
      message: "Failed to fetch polls",
    });
  }
};

// USER SUBMIT POLL VOTE
const submitPollVote = async (req, res) => {
  try {
    const { pollId, selectedOption } = req.body;

    // Check required data
    if (!pollId || !selectedOption) {
      return res.status(400).json({
        message: "Poll ID and selected option are required",
      });
    }

    // Get logged-in user from auth middleware
    const userId = req.userId;

    // DOES POLL EXITST?
    const poll = await AdminPollsForm.findById(pollId);

    if (!poll) {
      return res.status(404).json({
        message: "Poll not found",
      });
    }

    if (poll.expiresAt && new Date(poll.expiresAt).getTime() <= Date.now()) {
      return res.status(410).json({ message: "This poll has expired" });
    }

    // Check whether selected option actually belongs to this poll
    if (!poll.options.includes(selectedOption)) {
      return res.status(400).json({
        message: "Invalid poll option",
      });
    }

    // Check whether user has already voted
    const existingVote = await PollVote.findOne({
      poll: pollId,
      user: userId,
    });

    if (existingVote) {
      return res.status(409).json({
        message: "You have already voted in this poll",
      });
    }

    // Re-read expiry/options immediately before insert so an admin edit made
    // during validation cannot leave a stale poll state open for voting.
    const currentPoll = await AdminPollsForm.findById(pollId).select(
      "options expiresAt",
    );
    if (!currentPoll) {
      return res.status(404).json({ message: "Poll not found" });
    }
    if (
      currentPoll.expiresAt &&
      new Date(currentPoll.expiresAt).getTime() <= Date.now()
    ) {
      return res.status(410).json({ message: "This poll has expired" });
    }
    if (!currentPoll.options.includes(selectedOption)) {
      return res.status(400).json({ message: "Invalid poll option" });
    }

    // Create vote
    const vote = await PollVote.create({
      poll: pollId,
      user: userId,
      selectedOption,
    });

    // The room receives only an identifier; voter identity is never broadcast.
    emitPollEvent("polls:results-updated", { pollId: String(poll._id) });

    res.status(201).json({
      message: "Vote submitted successfully",
      vote,
    });
  } catch (err) {
    console.error("Error submitting vote:", err.message);

    // Handles duplicate vote at MongoDB level
    if (err.code === 11000) {
      return res.status(409).json({
        message: "You have already voted in this poll",
      });
    }

    res.status(500).json({
      message: "Failed to submit vote",
    });
  }
};

// user votes
const getUserVotes = async (req, res) => {
  try {
    const userId = req.userId;

    const votes = await PollVote.find({
      user: userId,
    }).select("poll selectedOption");

    res.status(200).json(votes);
  } catch (err) {
    console.error("Error fetching user votes:", err.message);

    res.status(500).json({
      message: "Failed to fetch user votes",
    });
  }
};

//GET POLL RESULT FOR ADMIN
const getAllPollResults = async (req, res) => {
  try {
    const pollsWithResults = await buildPollResults();
    res.status(200).json(pollsWithResults);
  } catch (err) {
    console.error("Error fetching poll results:", err.message);

    res.status(500).json({
      message: "Failed to fetch poll results",
    });
  }
};

// Authenticated users receive aggregate counts only, never individual votes.
const getPublicPollResults = async (_req, res) => {
  try {
    const pollsWithResults = await buildPollResults();
    res.status(200).json(
      pollsWithResults.map((poll) => ({
        _id: String(poll._id),
        question: poll.question,
        options: poll.options,
        expiresAt: poll.expiresAt,
        status: poll.status,
        results: poll.results,
        totalVotes: poll.totalVotes,
        highestVotes: poll.highestVotes,
      })),
    );
  } catch (err) {
    console.error("Error fetching public poll results:", err.message);
    res.status(500).json({ message: "Failed to fetch poll results" });
  }
};

// ADMIN DELETE POLL
const deletePoll = async (req, res) => {
  try {
    const { pollId } = req.params;

    const poll = await AdminPollsForm.findById(pollId);

    if (!poll) {
      return res.status(404).json({
        message: "Poll not found",
      });
    }

    // Delete the poll and immediately remove its timer from the schedule.
    const deletedPoll = await AdminPollsForm.findByIdAndDelete(pollId);
    if (!deletedPoll) {
      return res.status(404).json({ message: "Poll not found" });
    }
    refreshExpirySchedule();

    // Delete all votes belonging to this poll
    await PollVote.deleteMany({
      poll: pollId,
    });

    emitPollEvent("polls:deleted", { _id: String(poll._id) });

    res.status(200).json({
      message: "Poll deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting poll:", err.message);

    res.status(500).json({
      message: "Failed to delete poll",
    });
  }
};

// ADMIN UPDATE POLL
const updatePoll = async (req, res) => {
  try {
    const { pollId } = req.params;
    const { question, options } = req.body;

    if (!question || !options || options.length < 2) {
      return res.status(400).json({
        message: "Question and at least 2 options are required",
      });
    }

    const { expiresAt, error } = validateExpiry(req.body?.expiresAt, {
      requireFuture: false,
    });
    if (error) return res.status(400).json({ message: error });

    const poll = await AdminPollsForm.findById(pollId);

    if (!poll) {
      return res.status(404).json({
        message: "Poll not found",
      });
    }

    poll.question = question;
    poll.options = options;
    poll.expiresAt = expiresAt;

    await poll.save();

    refreshExpirySchedule();
    emitPollEvent("polls:updated", getPublicPoll(poll));

    res.status(200).json({
      message: "Poll updated successfully",
      poll,
    });
  } catch (err) {
    console.error("Error updating poll:", err.message);

    res.status(500).json({
      message: "Failed to update poll",
    });
  }
};

export {
  createPolls,
  fetchPollForm,
  submitPollVote,
  getUserVotes,
  getAllPollResults,
  getPublicPollResults,
  deletePoll,
  updatePoll,
};
