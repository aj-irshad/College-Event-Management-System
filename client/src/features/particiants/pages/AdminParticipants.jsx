import { useEffect, useState } from "react";
import { Users, Phone, Calendar, Shield, Search, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import socket from "../../../api/socket";
import { getAllParticipants, updateParticipationApproval } from "../../../services/participantService";
import { getEvents } from "../../../services/eventService";
import { getAdminPayments } from "../../../services/payment";
import "../styles/adminParticipants.css";

const AdminParticipants = () => {
  const [participants, setParticipants] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [pendingPaymentsLoading, setPendingPaymentsLoading] = useState(true);
  const [pendingPaymentsError, setPendingPaymentsError] = useState("");
  const [events, setEvents] = useState([]);
  const [filters, setFilters] = useState({ status: "All", role: "All", approvalStatus: "All", search: "", eventId: "" });
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [busyParticipantId, setBusyParticipantId] = useState("");

  useEffect(() => {
    let active = true;
    getEvents().then(({ data }) => {
      if (active) setEvents(Array.isArray(data) ? data : []);
    }).catch(() => {
      if (active) setError("Could not load the event list.");
    }).finally(() => {
      if (active) setEventsLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getAllParticipants(filters).then(({ data }) => {
      if (active) setParticipants(Array.isArray(data) ? data : []);
    }).catch((requestError) => {
      if (active) setError(requestError.response?.data?.message || "Failed to fetch participant rosters.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [filters]);

  useEffect(() => {
    let active = true;
    let requestRevision = 0;
    const refreshPendingPayments = () => {
      const currentRevision = ++requestRevision;
      setPendingPaymentsLoading(true);
      getAdminPayments("Pending").then(({ data }) => {
        if (active && currentRevision === requestRevision) {
          setPendingPayments(Array.isArray(data) ? data : []);
          setPendingPaymentsError("");
        }
      }).catch((requestError) => {
        if (active && currentRevision === requestRevision) setPendingPaymentsError(requestError.response?.data?.message || "Could not load pending payment submissions.");
      }).finally(() => {
        if (active && currentRevision === requestRevision) setPendingPaymentsLoading(false);
      });
    };
    refreshPendingPayments();
    socket.on("payments:updated", refreshPendingPayments);
    socket.on("connect", refreshPendingPayments);
    return () => {
      active = false;
      socket.off("payments:updated", refreshPendingPayments);
      socket.off("connect", refreshPendingPayments);
    };
  }, []);

  useEffect(() => {
    const refreshParticipants = () => {
      getAllParticipants(filters).then(({ data }) => {
        setParticipants(Array.isArray(data) ? data : []);
      }).catch((requestError) => {
        setError(requestError.response?.data?.message || "Failed to refresh participant rosters.");
      });
    };
    socket.on("participation:registered", refreshParticipants);
    socket.on("payments:updated", refreshParticipants);
    return () => {
      socket.off("participation:registered", refreshParticipants);
      socket.off("payments:updated", refreshParticipants);
    };
  }, [filters]);

  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const selectedEvent = events.find((event) => event._id === filters.eventId);

  const changeApprovalStatus = async (participant, approvalStatus) => {
    if (approvalStatus === "Not Approved" && !window.confirm("Reject this participation request?")) return;
    setBusyParticipantId(participant._id);
    setActionMessage("");
    setError("");
    try {
      const { data } = await updateParticipationApproval(participant._id, approvalStatus);
      const savedStatus = data?.participation?.approvalStatus || approvalStatus;
      setParticipants((current) => current.flatMap((item) => {
        if (item._id !== participant._id) return [item];
        if (filters.approvalStatus !== "All" && filters.approvalStatus !== savedStatus) return [];
        return [{ ...item, approvalStatus: savedStatus }];
      }));
      setActionMessage(`Participation ${savedStatus.toLowerCase()}.`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Could not update participation status.");
    } finally {
      setBusyParticipantId("");
    }
  };

  return (
    <main className="admin-participants-page">
      <header className="admin-header">
        <div>
          <h1>Event Participants</h1>
          <p>Review registrations, participant details, and event roles.</p>
        </div>
        <div className="participant-count-pill"><Users size={16} /><span>{participants.length} Records</span></div>
      </header>

      <section className="pending-payment-review" aria-labelledby="pending-payment-title">
        <div className="pending-payment-heading">
          <div>
            <h2 id="pending-payment-title">Paid event requests awaiting review</h2>
            <p>These are payment submissions, not confirmed participation records.</p>
          </div>
          <Link className="pending-payment-review-link" to="/admin/payments">Review all payments</Link>
        </div>
        {pendingPaymentsError && <p className="participant-error" role="alert">{pendingPaymentsError}</p>}
        {pendingPaymentsLoading ? (
          <p className="pending-payment-empty" role="status">Loading pending payment submissions…</p>
        ) : pendingPayments.length === 0 ? (
          <p className="pending-payment-empty">No pending paid-event submissions.</p>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table pending-payment-table">
              <thead><tr><th>Participant</th><th>Event</th><th>Amount</th><th>Transaction reference</th><th>Submitted</th><th>Payment status</th><th>Review</th></tr></thead>
              <tbody>{pendingPayments.map((payment) => <tr key={payment._id}>
                <td><div className="user-identity"><strong>{payment.user?.name || "Unknown User"}</strong><small>{payment.user?.email || "No email"}</small></div></td>
                <td>{payment.event?.title || "Event unavailable"}</td>
                <td>NPR {Number(payment.amount).toFixed(2)}</td>
                <td>{payment.transactionReference || "—"}</td>
                <td>{payment.createdAt ? new Date(payment.createdAt).toLocaleDateString() : "—"}</td>
                <td><span className="payment-badge pending">Payment Pending</span></td>
                <td><Link className="pending-payment-review-link" to="/admin/payments">Inspect proof &amp; decide</Link></td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </section>

      <section className="participant-filters" aria-label="Filter participation records">
        <label>
          <span>Event status</span>
          <select value={filters.status} onChange={(event) => updateFilter("status", event.target.value)}>
            {["All", "Upcoming", "Ongoing", "Completed"].map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label>
          <span>Participation role</span>
          <select value={filters.role} onChange={(event) => updateFilter("role", event.target.value)}>
            {["All", "Participant", "Volunteer", "Organizing Member"].map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label>
          <span>Approval status</span>
          <select value={filters.approvalStatus} onChange={(event) => updateFilter("approvalStatus", event.target.value)}>
            {["All", "Pending", "Approved", "Not Approved"].map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label className="participant-event-filter">
          <span>Event roster</span>
          <select value={filters.eventId} onChange={(event) => updateFilter("eventId", event.target.value)} disabled={eventsLoading}>
            <option value="">All events</option>
            {events.map((event) => <option value={event._id} key={event._id}>{event.title}</option>)}
          </select>
        </label>
        <label className="participant-search">
          <span>Search participants</span>
          <div><Search size={17} /><input type="search" maxLength={100} placeholder="Name, contact, department, event" value={filters.search} onChange={(event) => updateFilter("search", event.target.value)} /></div>
        </label>
        <button type="button" className="participant-reset-btn" onClick={() => setFilters({ status: "All", role: "All", approvalStatus: "All", search: "", eventId: "" })}>
          <RotateCcw size={16} /> Clear filters
        </button>
      </section>

      <div className="participant-roster-heading">
        <h2>{selectedEvent ? `${selectedEvent.title} roster` : "All event registrations"}</h2>
        <span>{participants.length} {participants.length === 1 ? "registration" : "registrations"}</span>
      </div>

      {error && <div className="participant-error" role="alert">{error}</div>}
      {actionMessage && <div className="participant-success" role="status">{actionMessage}</div>}
      {loading ? <div className="participant-state" role="status">Loading participation records…</div> : participants.length === 0 ? (
        <div className="participant-state">No participation records match these filters.</div>
      ) : (
        <div className="admin-table-container">
          <table className="admin-table">
            <thead><tr>
              <th>Participant</th><th>Contact</th><th>Participant department</th>
              <th>Event</th><th>Event department</th><th>Event status</th><th>Role</th><th>Payment</th><th>Approval</th><th>Registered</th><th>Actions</th>
            </tr></thead>
            <tbody>{participants.map((item) => {
              const user = item.user || {};
              const event = item.event || {};
              const approvalStatus = item.approvalStatus || "Pending";
              const isPaid = Number(event.price) > 0;
              return <tr key={item._id}>
                <td><div className="user-identity"><strong>{user.name || "Unknown User"}</strong><small>{user.email || "No email"}</small></div></td>
                <td><span className="contact-info"><Phone size={14} />{user.contact || "N/A"}</span></td>
                <td>{user.department || "—"}</td>
                <td><span className="event-title-cell"><Calendar size={14} />{event.title || "Deleted Event"}</span></td>
                <td>{event.department || "—"}</td>
                <td><span className={`event-status-badge ${String(event.status || "").toLowerCase()}`}>{event.status || "—"}</span></td>
                <td><span className={`role-badge ${item.participationType.toLowerCase().replace(/\s+/g, "-")}`}><Shield size={13} />{item.participationType}</span></td>
                <td><span className={`payment-badge ${isPaid ? "paid" : "free"}`}>{isPaid ? `Paid event · Rs ${Number(event.price).toFixed(2)} (verification status unavailable)` : "Free event"}</span></td>
                <td><span className={`approval-status-badge ${approvalStatus.toLowerCase().replace(/\s+/g, "-")}`}>{approvalStatus}</span></td>
                <td className="date-cell">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "—"}</td>
                <td><div className="approval-actions">
                  {approvalStatus === "Approved" ? (
                    <button type="button" className="approval-action-btn reject" disabled={busyParticipantId === item._id} onClick={() => changeApprovalStatus(item, "Not Approved")}>Reject</button>
                  ) : approvalStatus === "Not Approved" ? (
                    <button type="button" className="approval-action-btn approve" disabled={busyParticipantId === item._id} onClick={() => changeApprovalStatus(item, "Approved")}>Approve</button>
                  ) : (
                    <>
                      <button type="button" className="approval-action-btn approve" disabled={busyParticipantId === item._id} onClick={() => changeApprovalStatus(item, "Approved")}>Approve</button>
                      <button type="button" className="approval-action-btn reject" disabled={busyParticipantId === item._id} onClick={() => changeApprovalStatus(item, "Not Approved")}>Reject</button>
                    </>
                  )}
                </div></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      )}
    </main>
  );
};

export default AdminParticipants;
