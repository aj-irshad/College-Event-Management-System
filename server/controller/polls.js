import AdminPollsForm from "../model/adminPolls.js";
import PollVote from "../model/UserVotes.js";
import Users from "../model/user.js";
import { emitPollToAudience } from "../socket.js";
import { refreshPollExpirySchedule } from "./pollExpiryJob.js";

import createNotification from "../utils/bellNotification.js";
import { EVENT_DEPARTMENTS, EVENT_SEMESTERS, isEventAvailableToUser } from "../utils/eventTargeting.js";

const emitPollEvent = (eventName, payload, poll, previousPoll) => {
  try {
    emitPollToAudience(eventName, payload, poll, previousPoll);
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
  audienceTargets: poll.audienceTargets || [],
  expiresAt: poll.expiresAt || null,
  status: getPollStatus(poll.expiresAt),
});

const refreshExpirySchedule = () => {
  void refreshPollExpirySchedule().catch((error) => {
    console.error("Failed to refresh poll expiry schedule:", error.message);
  });
};

const validateAudienceTargets = (targets) => {
  if (targets === undefined) return { value: [] };
  if (!Array.isArray(targets)) return { error: "Audience targets must be a list" };
  const departments = new Set();
  for (const target of targets) {
    if (!target || !EVENT_DEPARTMENTS.includes(target.department)) return { error: "Audience target contains an invalid department" };
    if (departments.has(target.department)) return { error: "Audience target departments cannot be duplicated" };
    departments.add(target.department);
    if (!Array.isArray(target.semesters) || !target.semesters.length) return { error: "Select at least one semester for every targeted department" };
    if (target.semesters.some((semester) => !EVENT_SEMESTERS.includes(semester)) || new Set(target.semesters).size !== target.semesters.length) {
      return { error: "Audience target semesters must be valid and unique" };
    }
  }
  return { value: targets };
};

const getEligiblePolls = async (polls, userId) => {
  const user = await Users.findById(userId).select("role department semester").lean();
  if (!user) return [];
  return user.role === "admin" ? polls : polls.filter((poll) => isEventAvailableToUser(poll, user));
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
    const { value: audienceTargets, error: audienceError } = validateAudienceTargets(req.body?.audienceTargets);
    if (audienceError) return res.status(400).json({ message: audienceError });
    const { expiresAt, error } = validateExpiry(req.body?.expiresAt);
    if (error) return res.status(400).json({ message: error });
    const newPoll = await AdminPollsForm.create({
      question,
      options,
      expiresAt,
      audienceTargets,
    });

    refreshExpirySchedule();
    emitPollEvent("polls:created", getPublicPoll(newPoll), newPoll);

    createNotification(
      "New Campus Poll Active",
      `Cast your vote for: "${question}"`,
      "poll",
      newPoll._id,
      { recipientIds: await getPollRecipientIds(newPoll) },
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
    const allPolls = await AdminPollsForm.find().sort({ _id: -1 }).lean();
    const polls = await getEligiblePolls(allPolls, req.userId);
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

    const [user] = await Promise.all([Users.findById(userId).select("role department semester").lean()]);
    if (!user || !isEventAvailableToUser(poll, user)) {
      return res.status(403).json({ message: "This poll is not available to your department and semester" });
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
      "options expiresAt audienceTargets",
    );
    if (!currentPoll) {
      return res.status(404).json({ message: "Poll not found" });
    }
    if (!isEventAvailableToUser(currentPoll, user)) {
      return res.status(403).json({ message: "This poll is not available to your department and semester" });
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
    emitPollEvent("polls:results-updated", { pollId: String(poll._id) }, currentPoll);

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
const getPublicPollResults = async (req, res) => {
  try {
    const pollsWithResults = await getEligiblePolls(await buildPollResults(), req.userId);
    res.status(200).json(
      pollsWithResults.map((poll) => ({
        _id: String(poll._id),
        question: poll.question,
        options: poll.options,
        audienceTargets: poll.audienceTargets || [],
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

const getPollRecipientIds = async (poll) => {
  const targeted = Array.isArray(poll.audienceTargets) && poll.audienceTargets.length > 0;
  const users = await Users.find(targeted ? { role: "user" } : {}).select("_id role department semester").lean();
  return users.filter((user) => isEventAvailableToUser(poll, user)).map(({ _id }) => _id);
};

const getPollVotesAdmin = async (req, res) => {
  if (!/^[a-f\d]{24}$/i.test(req.params.pollId)) return res.status(400).json({ message: "Invalid poll ID" });
  try {
    const poll = await AdminPollsForm.findById(req.params.pollId).select("question options").lean();
    if (!poll) return res.status(404).json({ message: "Poll not found" });
    const votes = await PollVote.find({ poll: poll._id })
      .populate("user", "name email department semester")
      .sort({ createdAt: -1 })
      .lean();
    return res.status(200).json({ poll, votes });
  } catch (error) {
    console.error("Could not load poll voter records:", error.message);
    return res.status(500).json({ message: "Could not load poll voter records" });
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

    emitPollEvent("polls:deleted", { _id: String(poll._id) }, null, poll);

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

    const { value: audienceTargets, error: audienceError } = validateAudienceTargets(
      req.body?.audienceTargets === undefined ? poll.audienceTargets || [] : req.body.audienceTargets,
    );
    if (audienceError) return res.status(400).json({ message: audienceError });

    const previousPoll = poll.toObject();
    poll.question = question;
    poll.options = options;
    poll.expiresAt = expiresAt;
    poll.audienceTargets = audienceTargets;

    await poll.save();

    refreshExpirySchedule();
    emitPollEvent("polls:updated", getPublicPoll(poll), poll, previousPoll);

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
  getPollVotesAdmin,
  deletePoll,
  updatePoll,
};
