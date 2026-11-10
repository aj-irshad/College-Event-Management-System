import { useContext } from "react";
import { deletePoll } from "../../../services/pollService.js";
import { useNavigate } from "react-router-dom";
import { BarChart3, Plus } from "lucide-react";

import PollBtn from "../components/PollBtn.jsx";

import "../styles/adminPollResult.css";
import PollResultCard from "../components/PollResultCard.jsx";
import pollContext from "../../../context/pollContext.jsx";
import { EmptyState } from "../../../components/ModulePageUI";
import { fetchPollVotesAdmin } from "../../../services/pollService.js";
import { useState } from "react";

const AdminPoll = () => {
  const { pollResults: polls, pollResultsLoading: resultsLoading, pollLoading, pollError, pollResultsError, removePoll } =
    useContext(pollContext);
  const loading = resultsLoading || pollLoading;
  const navigate = useNavigate();
  const [voteDetails, setVoteDetails] = useState(null);
  const [voteError, setVoteError] = useState("");

  const showVotes = async (pollId) => {
    try {
      const { data } = await fetchPollVotesAdmin(pollId);
      setVoteDetails(data);
      setVoteError("");
    } catch (error) {
      setVoteError(error.response?.data?.message || "Could not load voter records.");
    }
  };

  // Delete poll
  const handleDelete = async (pollId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this poll?",
    );

    if (!confirmDelete) return;

    try {
      await deletePoll(pollId);
      // The socket event updates all sessions; this also updates the admin if
      // its socket is disconnected after the REST deletion succeeds.
      removePoll(pollId);
    } catch (error) {
      console.error("Error deleting poll:", error);

      alert(error.response?.data?.message || "Failed to delete poll");
    }
  };

  // Loading state
  if (loading) {
    return <div>Loading poll results...</div>;
  }

  return (
    <div className="admin-poll-results">
      {/* Header */}
      <div className="poll-results-header">
        <div>
          <h1>Poll Results</h1>
          <p>View the results of all polls.</p>
        </div>

        {/* Create Poll */}
        <PollBtn
          text="Create Poll"
          onClick={() => navigate("/create-poll")}
          icon={<Plus size={18} />}
        />
      </div>

      {(pollError || pollResultsError) && <p role="alert">{pollError || pollResultsError}</p>}
      {/* No polls */}
      {polls.length === 0 ? (
        pollError || pollResultsError ? null : <EmptyState
          icon={BarChart3}
          title="No polls yet"
          description="Create a poll to collect responses from the campus community."
          actionLabel="Create Poll"
          actionIcon={<Plus size={18} />}
          onAction={() => navigate("/create-poll")}
        />
      ) : (
        <div className="poll-results-container">
          {polls.map((poll) => (
            <PollResultCard
              key={poll._id}
              poll={poll}
              onEdit={() => navigate(`/edit-poll/${poll._id}`)}
              onDelete={handleDelete}
              onViewVotes={() => void showVotes(poll._id)}
            />
          ))}
        </div>
      )}
      {voteError && <p role="alert">{voteError}</p>}
      {voteDetails && <section className="poll-voter-details">
        <h2>{voteDetails.poll.question} · Voter responses</h2>
        <button type="button" onClick={() => setVoteDetails(null)}>Close voter list</button>
        <div className="poll-voter-table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Department</th><th>Semester</th><th>Selected option</th><th>Voted at</th></tr></thead>
          <tbody>{voteDetails.votes.map((vote) => <tr key={vote._id}><td>{vote.user?.name || "Unknown"}</td><td>{vote.user?.email || "—"}</td><td>{vote.user?.department || "—"}</td><td>{vote.user?.semester || "—"}</td><td>{vote.selectedOption}</td><td>{new Date(vote.createdAt).toLocaleString()}</td></tr>)}</tbody>
        </table></div>
      </section>}
    </div>
  );
};

export default AdminPoll;
