import { useContext, useState, useEffect } from "react";
import pollContext from "../../../context/pollContext";
import { submitPollVote, getUserVotes } from "../../../services/pollService";
import "../styles/userPoll.css";

const UserPoll = () => {
  const { pollForm, pollLoading, pollResults, pollResultsLoading } =
    useContext(pollContext);

  const [selectedOptions, setSelectedOptions] = useState({});
  const [votedPolls, setVotedPolls] = useState({});
  const [clockNow, setClockNow] = useState(Date.now());

  useEffect(() => {
    const expiries = pollForm
      .map((poll) => new Date(poll.expiresAt).getTime())
      .filter((time) => Number.isFinite(time) && time > Date.now());
    if (!expiries.length) return undefined;

    const nextExpiry = Math.min(...expiries);
    const timer = window.setTimeout(
      () => setClockNow(Date.now()),
      Math.max(1, Math.min(nextExpiry - Date.now() + 10, 2 ** 31 - 1)),
    );
    return () => window.clearTimeout(timer);
  }, [pollForm]);

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

  const handleSubmit = async (e, poll) => {
    e.preventDefault();
    const pollId = poll._id;

    // Prevent submitting again
    if (votedPolls[pollId]) return;
    if (
      poll.status === "Completed" ||
      (poll.expiresAt && new Date(poll.expiresAt).getTime() <= Date.now())
    ) {
      alert("This poll has expired");
      return;
    }

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
  if (pollLoading) {
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
        const result = pollResults.find((poll) => poll._id === form._id);
        const isExpired =
          form.status === "Completed" ||
          (form.expiresAt && new Date(form.expiresAt).getTime() <= clockNow);

        return (
          <form
            className="userPollForm"
            key={form._id}
            onSubmit={(e) => handleSubmit(e, form)}
          >
            <h3 className="pollQuestion">{form.question}</h3>

            <div className="poll-user-meta">
              <span className={`poll-user-status ${isExpired ? "is-completed" : "is-active"}`}>
                {isExpired ? "Completed" : "Voting open"}
              </span>
              <span>
                {form.expiresAt
                  ? `${isExpired ? "Expired" : "Expires"}: ${new Date(form.expiresAt).toLocaleString()}`
                  : "No expiry set (legacy poll)"}
              </span>
            </div>

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
                    disabled={isVoted || isExpired}
                  />

                  <label htmlFor={optionId}>{option}</label>
                </article>
              );
            })}

            <button className="voteButton" type="submit" disabled={isVoted || isExpired}>
              {isVoted ? "Voted ✓" : isExpired ? "Poll completed" : "Vote"}
            </button>

            {isVoted && (
              <p className="votedMessage">Your vote has been submitted.</p>
            )}

            <section className="poll-live-results" aria-live="polite">
              <h4>Live results</h4>
              {pollResultsLoading ? (
                <p>Loading results…</p>
              ) : result ? (
                <>
                  <p className="poll-live-total">
                    {result.totalVotes} {result.totalVotes === 1 ? "vote" : "votes"}
                  </p>
                  {result.results.map((optionResult) => {
                    const percentage = result.totalVotes
                      ? (optionResult.votes / result.totalVotes) * 100
                      : 0;
                    return (
                      <div className="poll-live-result" key={optionResult.option}>
                        <div className="poll-live-result-label">
                          <span>{optionResult.option}</span>
                          <span>
                            {optionResult.votes} · {percentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="poll-live-result-track">
                          <div
                            className="poll-live-result-fill"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                <p>Results are currently unavailable.</p>
              )}
            </section>
          </form>
        );
      })}
    </div>
  );
};

export default UserPoll;
