import { useEffect, useState } from "react";
import { QrCode, CalendarDays } from "lucide-react";
import { getMyParticipation } from "../../../services/participantService.js"; // matches your services path
import { formatDate, formatTime } from "../../../hooks/dateFormatter.js"; // adjust path as needed
import "../styles/userParticipants.css";

const UserParticipants = () => {
  const [participations, setParticipations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchParticipation = async () => {
      try {
        const response = await getMyParticipation();
        setParticipations(response.data);
      } catch (err) {
        setError("Failed to load your participations. Please try again later.");
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchParticipation();
  }, []);

  return (
    <main className="participation-page">
      <div className="participation-header">
        <h1>My Participation & Tickets</h1>
        <p>
          Track your registered events, access digital entry passes, and view
          payment receipts.
        </p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <div className="loading-state">Loading your tickets...</div>
      ) : participations.length === 0 ? (
        <div className="empty-participation-state">
          <CalendarDays size={48} />
          <h3>No Registered Events Found</h3>
          <p>
            You haven't participated in any events yet. Explore upcoming events
            to register!
          </p>
        </div>
      ) : (
        <div className="participation-table-container">
          <table className="participation-table">
            <thead>
              <tr>
                <th>Event Title & Dept</th>
                <th>Date & Time</th>
                <th>Payment State</th>
                <th>Action Pass</th>
              </tr>
            </thead>
            <tbody>
              {participations.map((item) => {
                const event = item.event || {};
                const isPaid = event.price && event.price > 0;

                return (
                  <tr key={item._id}>
                    <td>
                      <div className="event-info-cell">
                        <strong>{event.title || "Untitled Event"}</strong>
                        <span className="event-dept-badge">
                          {event.event_type || "General"}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="event-time-cell">
                        <span>
                          {event.start_at ? formatDate(event.start_at) : "TBD"}
                        </span>
                        <small>
                          {event.start_at && event.end_at
                            ? `${formatTime(event.start_at)} - ${formatTime(event.end_at)}`
                            : ""}
                        </small>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`payment-badge ${isPaid ? "paid" : "free"}`}
                      >
                        {isPaid
                          ? `$${event.price.toFixed(2)} Paid`
                          : "Free Entry"}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="view-ticket-btn"
                        onClick={() =>
                          alert(`Viewing ticket pass for: ${event.title}`)
                        }
                      >
                        <QrCode size={16} />
                        View Ticket
                      </button>
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

export default UserParticipants;
