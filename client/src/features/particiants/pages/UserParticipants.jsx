import { useEffect, useRef, useState } from "react";
import { CalendarDays } from "lucide-react";
import { getMyParticipation } from "../../../services/participantService.js";
import { formatDate, formatTime } from "../../../hooks/dateFormatter.js";
import socket from "../../../api/socket.js";
import "../styles/userParticipants.css";

const UserParticipants = () => {
  const [participations, setParticipations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const revisionRef = useRef(0);

  useEffect(() => {
    let active = true;
    const loadParticipations = async () => {
      const revisionAtRequest = revisionRef.current;
      try {
        const { data } = await getMyParticipation();
        if (active && revisionRef.current === revisionAtRequest) {
          setParticipations(Array.isArray(data) ? data : []);
          setError("");
        }
      } catch (requestError) {
        if (active) setError(requestError.response?.data?.message || "Failed to load your participations. Please try again later.");
      } finally {
        if (active) setLoading(false);
      }
    };

    const handleApprovalUpdate = ({ participationId, approvalStatus } = {}) => {
      if (!participationId || !approvalStatus) return;
      revisionRef.current += 1;
      setParticipations((current) => current.map((item) => item._id === participationId
        ? { ...item, approvalStatus }
        : item));
    };

    void loadParticipations();
    socket.on("participation:status-updated", handleApprovalUpdate);
    socket.on("connect", loadParticipations);
    window.addEventListener("focus", loadParticipations);
    return () => {
      active = false;
      socket.off("participation:status-updated", handleApprovalUpdate);
      socket.off("connect", loadParticipations);
      window.removeEventListener("focus", loadParticipations);
    };
  }, []);

  return (
    <main className="participation-page">
      <header className="participation-header">
        <h1>My Participation</h1>
        <p>View your registered events and approval status.</p>
      </header>

      {error && <div className="error-banner" role="alert">{error}</div>}
      {loading ? <div className="loading-state" role="status">Loading your participations…</div> : participations.length === 0 ? (
        <div className="empty-participation-state"><CalendarDays size={48} /><h3>No Registered Events Found</h3><p>You haven’t participated in any events yet. Explore upcoming events to register.</p></div>
      ) : (
        <div className="participation-table-container">
          <table className="participation-table">
            <thead><tr><th>Event</th><th>Event date &amp; time</th><th>Department</th><th>Event status</th><th>Role</th><th>Payment</th><th>Approval status</th></tr></thead>
            <tbody>{participations.map((item) => {
              const event = item.event || {};
              const isPaid = Number(event.price) > 0;
              return <tr key={item._id}>
                <td><div className="event-info-cell"><strong>{event.title || "Untitled Event"}</strong><span className="event-dept-badge">{event.event_type || "General"}</span></div></td>
                <td><div className="event-time-cell"><span>{event.start_at ? formatDate(event.start_at) : "TBD"}</span><small>{event.start_at && event.end_at ? `${formatTime(event.start_at)} – ${formatTime(event.end_at)}` : ""}</small></div></td>
                <td>{event.department || "—"}</td>
                <td><span className={`event-status-badge ${String(event.status || "").toLowerCase()}`}>{event.status || "—"}</span></td>
                <td><span className="participation-role-badge">{item.participationType}</span></td>
                <td><span className={`payment-badge ${isPaid ? "paid" : "free"}`}>{isPaid ? `Paid event · Rs ${Number(event.price).toFixed(2)} (verification status unavailable)` : "Free event"}</span></td>
                <td><span className={`approval-status-badge ${(item.approvalStatus || "Pending").toLowerCase().replace(/\s+/g, "-")}`}>{item.approvalStatus || "Pending"}</span></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      )}
    </main>
  );
};

export default UserParticipants;
