import { useContext } from "react";
import { deletePoll } from "../../../services/pollService.js";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";

import PollBtn from "../components/PollBtn.jsx";

import "../styles/adminPollResult.css";
import PollResultCard from "../components/PollResultCard.jsx";
import pollContext from "../../../context/pollContext.jsx";

const AdminPoll = () => {
  const { pollResults: polls, pollResultsLoading: loading, removePoll } =
    useContext(pollContext);
  const navigate = useNavigate();

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

      {/* No polls */}
      {polls.length === 0 ? (
        <div className="no-polls">
          <h3>No polls available</h3>
        </div>
      ) : (
        <div className="poll-results-container">
          {polls.map((poll) => (
            <PollResultCard
              key={poll._id}
              poll={poll}
              onEdit={() => navigate(`/edit-poll/${poll._id}`)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPoll;
