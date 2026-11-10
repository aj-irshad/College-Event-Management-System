import { Pencil, Trash2 } from "lucide-react";
import PollBtn from "./PollBtn.jsx";
import PollResultOption from "./PollResultOption.jsx";

const PollResultCard = ({ poll, onEdit, onDelete, onViewVotes }) => {
  // Find winner
  const winner =
    poll.highestVotes > 0
      ? poll.results.find((item) => item.votes === poll.highestVotes)
      : null;

  return (
    <div className="poll-result-card">
      {/* Poll Header */}
      <div className="poll-result-top">
        <div className="poll-question">
          <h2>{poll.question}</h2>

          <span className="total-votes">
            {poll.totalVotes} {poll.totalVotes === 1 ? "Vote" : "Votes"}
          </span>
          <div className={`poll-status-badge ${poll.status === "Completed" ? "is-completed" : "is-active"}`}>
            {poll.status === "Completed" ? "Completed" : "Active"}
          </div>
          <p className="poll-expiry-display">
            {poll.expiresAt
              ? `Expires: ${new Date(poll.expiresAt).toLocaleString()}`
              : "No expiry set (legacy poll)"}
          </p>
          <p className="poll-expiry-display">
            {poll.audienceTargets?.length
              ? poll.audienceTargets.map((target) => `${target.department}: ${(target.semesters || []).join(", ")}`).join(" · ")
              : "Available to all students"}
          </p>
        </div>

        {/* Actions */}
        <div className="poll-actions">
          <PollBtn text="View voters" onClick={onViewVotes} />
          <PollBtn
            text="Edit"
            onClick={() => onEdit(poll._id)}
            icon={<Pencil size={16} />}
          />

          <PollBtn
            text="Delete"
            onClick={() => onDelete(poll._id)}
            icon={<Trash2 size={16} />}
            style={{ backgroundColor: "red" }}
          />
        </div>
      </div>

      {/* Winner */}
      {winner && (
        <div className="poll-winner">
          🏆 Highest Votes: <strong>{winner.option}</strong>
          <span>({winner.votes} votes)</span>
        </div>
      )}

      {/* Poll Options */}
      <div className="poll-result-options">
        {poll.results.map((result) => (
          <PollResultOption
            key={result.option}
            result={result}
            totalVotes={poll.totalVotes}
            highestVotes={poll.highestVotes}
          />
        ))}
      </div>

      {/* No Votes */}
      {poll.totalVotes === 0 && (
        <p className="no-votes">No one has voted in this poll yet.</p>
      )}
    </div>
  );
};

export default PollResultCard;
