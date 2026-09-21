import AdminPollsForm from "../model/adminPolls.js";
import PollVote from "../model/UserVotes.js";
// ADMIN CREATE POLL FORMS
const createPolls = async (req, res) => {
  try {
    const { question, options } = req.body;

    console.log(question);
    console.log(options);
    await AdminPollsForm.create({
      question,
      options,
    });

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
    const polls = await AdminPollsForm.find();
    res.status(200).json(polls);
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

    // Create vote
    const vote = await PollVote.create({
      poll: pollId,
      user: userId,
      selectedOption,
    });

    console.log("Vote submitted:", vote);

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
    const polls = await AdminPollsForm.find().lean();

    const results = await PollVote.aggregate([
      {
        $group: {
          _id: {
            poll: "$poll",
            option: "$selectedOption",
          },
          votes: {
            $sum: 1,
          },
        },
      },
    ]);

    const pollsWithResults = polls.map((poll) => {
      const pollResults = poll.options.map((option) => {
        const result = results.find(
          (item) =>
            item._id.poll.toString() === poll._id.toString() &&
            item._id.option === option,
        );

        return {
          option,
          votes: result ? result.votes : 0,
        };
      });

      const totalVotes = pollResults.reduce(
        (total, item) => total + item.votes,
        0,
      );

      const highestVotes =
        totalVotes > 0 ? Math.max(...pollResults.map((item) => item.votes)) : 0;

      return {
        ...poll,
        results: pollResults,
        totalVotes,
        highestVotes,
      };
    });

    res.status(200).json(pollsWithResults);
  } catch (err) {
    console.error("Error fetching poll results:", err.message);

    res.status(500).json({
      message: "Failed to fetch poll results",
    });
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

    // Delete the poll
    await AdminPollsForm.findByIdAndDelete(pollId);

    // Delete all votes belonging to this poll
    await PollVote.deleteMany({
      poll: pollId,
    });

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

    const poll = await AdminPollsForm.findById(pollId);

    if (!poll) {
      return res.status(404).json({
        message: "Poll not found",
      });
    }

    poll.question = question;
    poll.options = options;

    await poll.save();

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
  deletePoll,
  updatePoll,
};
