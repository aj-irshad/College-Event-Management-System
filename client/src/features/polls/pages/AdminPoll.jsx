import { useEffect, useState } from "react";
import { fetchPollResult, deletePoll } from "../../../services/pollService.js";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";

import PollBtn from "../components/PollBtn.jsx";

import "../styles/adminPollResult.css";
import PollResultCard from "../components/PollResultCard.jsx";

const AdminPoll = () => {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  // Fetch poll results
  useEffect(() => {
    const pollResult = async () => {
      try {
        const response = await fetchPollResult();

        setPolls(response.data);
      } catch (error) {
        console.error("Error fetching poll results:", error);
      } finally {
        setLoading(false);
      }
    };

    pollResult();
  }, []);

  // Delete poll
  const handleDelete = async (pollId) => {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this poll?",
    );

    if (!confirmDelete) return;

    try {
      await deletePoll(pollId);

      // Remove deleted poll from UI
      setPolls((prevPolls) => prevPolls.filter((poll) => poll._id !== pollId));
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
