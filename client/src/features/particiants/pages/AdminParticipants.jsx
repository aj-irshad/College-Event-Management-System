import { useEffect, useState } from "react";
import { Users, Phone, Calendar, Shield } from "lucide-react";
import { getAllParticipants } from "../../../services/participantService"; // adjust path as needed
import "../styles/adminParticipants.css";

const AdminParticipants = () => {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAllParticipants = async () => {
      try {
        // Calls the admin endpoint we will add to the backend below
        const response = await getAllParticipants();
        setParticipants(response.data);
      } catch (err) {
        setError("Failed to fetch participant rosters.");
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAllParticipants();
  }, []);

  return (
    <main className="admin-participants-page">
      <div className="admin-header">
        <div>
          <h1>Event Participants Management</h1>
          <p>
            Review registered participants, phone numbers, and event roles
            across campus.
          </p>
        </div>
        <div className="participant-count-pill">
          <Users size={16} />
          <span>{participants.length} Total Registered</span>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="loading-state">Loading participant rosters...</div>
      ) : participants.length === 0 ? (
        <div className="empty-state">
          No participant records found in the database.
        </div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Participant Name</th>
                <th>Contact Phone</th>
                <th>Event Title</th>
                <th>Participation Type</th>
                <th>Registered On</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((item) => {
                const user = item.user || {};
                const event = item.event || {};

                return (
                  <tr key={item._id}>
                    <td>
                      <div className="user-identity">
                        <strong>{user.name || "Unknown User"}</strong>
                        <small>{user.email || "No email"}</small>
                      </div>
                    </td>
                    <td>
                      <span className="contact-info">
                        <Phone size={14} />
                        {user.contact || "N/A"}
                      </span>
                    </td>
                    <td>
                      <span className="event-title-cell">
                        <Calendar size={14} />
                        {event.title || "Deleted Event"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`role-badge ${item.participationType.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <Shield size={13} />
                        {item.participationType}
                      </span>
                    </td>
                    <td className="date-cell">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
};

export default AdminParticipants;
