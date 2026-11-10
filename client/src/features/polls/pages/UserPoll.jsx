import { useContext, useState, useEffect } from "react";
import { BarChart3 } from "lucide-react";
import { EmptyState } from "../../../components/ModulePageUI";
import pollContext from "../../../context/pollContext";
import { submitPollVote, getUserVotes } from "../../../services/pollService";
import { useSearchParams } from "react-router-dom";
import "../styles/userPoll.css";

const UserPoll = () => {
  const { pollForm, pollLoading, pollError, pollResults, pollResultsLoading } =
    useContext(pollContext);
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedOptions, setSelectedOptions] = useState({});
  const [votedPolls, setVotedPolls] = useState({});
  const [clockNow, setClockNow] = useState(Date.now());
  const [selectedPollId, setSelectedPollId] = useState(() => searchParams.get("poll") || "");

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

  // Keep request failures separate from a genuinely empty result.
  if (pollForm.length === 0 && pollError) {
    return (
      <div className="no-polls">
        <p role="alert">{pollError}</p>
      </div>
    );
  }

  if (pollForm.length === 0) {
    return <EmptyState icon={BarChart3} title="No polls yet" description="There are no polls available right now. Check back later for campus questions." />;
  }

  if (!selectedPollId) {
    return (
      <div className="userPollContainer">
        <h1>Campus Polls</h1>
        {pollError && <p role="alert">{pollError}</p>}
        {pollForm.map((poll) => {
          const expired = poll.status === "Completed" || (poll.expiresAt && new Date(poll.expiresAt).getTime() <= clockNow);
          return <article className="userPollForm" key={poll._id}>
            <h3 className="pollQuestion">{poll.question}</h3>
            <p>{expired ? "Voting closed" : "Voting open"}{poll.expiresAt ? ` · ${expired ? "Expired" : "Expires"}: ${new Date(poll.expiresAt).toLocaleString()}` : " · No expiry set"}</p>
            <p>{votedPolls[poll._id] ? "You have voted" : "You have not voted"}</p>
            <button className="voteButton" type="button" onClick={() => { setSelectedPollId(poll._id); setSearchParams({ poll: poll._id }); }}>Open poll</button>
          </article>;
        })}
      </div>
    );
  }

  const selectedPoll = pollForm.find((poll) => poll._id === selectedPollId);
  if (!selectedPoll) {
    return <div className="userPollContainer"><p>This poll is no longer available.</p><button type="button" onClick={() => { setSelectedPollId(""); setSearchParams({}); }}>Back to polls</button></div>;
  }

  return (
    <div className="userPollContainer">
      {pollError && <p role="alert">{pollError}</p>}
      <button type="button" className="voteButton" onClick={() => { setSelectedPollId(""); setSearchParams({}); }}>Back to polls</button>
      {[selectedPoll].map((form) => {
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
