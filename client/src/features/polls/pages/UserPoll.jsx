import { useContext, useState, useEffect } from "react";
import pollContext from "../../../context/pollContext";
import { submitPollVote, getUserVotes } from "../../../services/pollService";
import "../styles/userPoll.css";

const UserPoll = () => {
  const { pollForm, loading } = useContext(pollContext);

  const [selectedOptions, setSelectedOptions] = useState({});
  const [votedPolls, setVotedPolls] = useState({});

  useEffect(() => {
    const fetchUserVotes = async () => {
      try {
        const votes = await getUserVotes();

        const voted = {};
        const selected = {};

        votes.forEach((vote) => {
          voted[vote.poll] = true;
          selected[vote.poll] = vote.selectedOption;
        });

        setVotedPolls(voted);
        setSelectedOptions(selected);
      } catch (err) {
        console.error("Error fetching user votes:", err);
      }
    };

    fetchUserVotes();
  }, []);

  const handleOptionChange = (pollId, option) => {
    // Don't allow changing the answer after voting
    if (votedPolls[pollId]) return;

    setSelectedOptions((prev) => ({
      ...prev,
      [pollId]: option,
    }));
  };

  const handleSubmit = async (e, pollId) => {
    e.preventDefault();

    // Prevent submitting again
    if (votedPolls[pollId]) return;

    const selectedOption = selectedOptions[pollId];

    if (!selectedOption) {
      alert("Please select an option");
      return;
    }

    try {
      await submitPollVote(pollId, selectedOption);

      // Lock this poll
      setVotedPolls((prev) => ({
        ...prev,
        [pollId]: true,
      }));

      alert("Your vote has been submitted successfully");
    } catch (err) {
      console.error("Error submitting vote:", err);

      alert(err.response?.data?.message || "Failed to submit your vote");
    }
  };

  // Loading
  if (loading) {
    return <p>Loading polls...</p>;
  }

  // No polls
  if (pollForm.length === 0) {
    return (
      <div className="no-polls">
        <h3>No polls available</h3>
      </div>
    );
  }

  return (
    <div className="userPollContainer">
      {pollForm.map((form) => {
        const isVoted = votedPolls[form._id];

        return (
          <form
            className="userPollForm"
            key={form._id}
            onSubmit={(e) => handleSubmit(e, form._id)}
          >
            <h3 className="pollQuestion">{form.question}</h3>

            {form.options.map((option, idx) => {
              const optionId = `${form._id}-option-${idx}`;

              return (
                <article className="options" key={idx}>
                  <input
                    type="radio"
                    name={`poll-${form._id}`}
                    id={optionId}
                    value={option}
                    checked={selectedOptions[form._id] === option}
                    onChange={() => handleOptionChange(form._id, option)}
                    disabled={isVoted}
                  />

                  <label htmlFor={optionId}>{option}</label>
                </article>
              );
            })}

            <button className="voteButton" type="submit" disabled={isVoted}>
              {isVoted ? "Voted ✓" : "Vote"}
            </button>

            {isVoted && (
              <p className="votedMessage">Your vote has been submitted.</p>
            )}
          </form>
        );
      })}
    </div>
  );
};

export default UserPoll;
