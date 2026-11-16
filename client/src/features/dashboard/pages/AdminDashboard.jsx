import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarClock,
  Flame,
  CheckCircle2,
  Newspaper,
  BarChart3,
  MessageSquare,
  CalendarDays,
  Plus,
  Vote,
  CreditCard,
  Users,
  UserPlus,
} from "lucide-react";

import EventBtn from "../../events/components/EventBtn";
import PollBtn from "../../polls/components/PollBtn.jsx";
import eventContext from "../../../context/EventContext.jsx";
import blogContext from "../../../context/blogContext.jsx";
import feedbackContext from "../../../context/feedbackContext.jsx";
import pollContext from "../../../context/pollContext.jsx";
import { fetchAdminFeedbackForms } from "../../../services/feedbackService.js";
import { getAllParticipants } from "../../../services/participantService.js";
import { getAdminPayments } from "../../../services/payment.js";
import { createAdminAccount } from "../../../services/userServices.js";
import apiRequest from "../../../api/apiRequest.js";
import socket from "../../../api/socket.js";
import "../styles/adminDashboard.css";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const {
    events,
    upcomingEvents,
    ongoingEvents,
    completedEvents,
    eventLoading,
    eventError,
  } = useContext(eventContext);
  const { totalBlogs } = useContext(blogContext);
  const { totalFeedback } = useContext(feedbackContext);
  const { totalPolls, pollResults } = useContext(pollContext);
  const [studentCount, setStudentCount] = useState(null);
  const [feedbackForms, setFeedbackForms] = useState([]);
  const [pendingParticipationCount, setPendingParticipationCount] =
    useState(null);
  const [pendingPaymentCount, setPendingPaymentCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdminForm, setShowAdminForm] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminSubmitting, setAdminSubmitting] = useState(false);
  const [adminError, setAdminError] = useState("");
  const [adminMessage, setAdminMessage] = useState("");
  const adminSubmitLock = useRef(false);
  const overviewRequest = useRef(0);

  const loadOverview = useCallback(async () => {
    const requestId = ++overviewRequest.current;
    try {
      const [users, forms, pendingParticipations, pendingPayments] =
        await Promise.all([
          apiRequest.get("/user/admin/student-count"),
          fetchAdminFeedbackForms(),
          getAllParticipants({ approvalStatus: "Pending" }),
          getAdminPayments("Pending"),
        ]);
      if (requestId !== overviewRequest.current) return;
      setStudentCount(users.data.totalStudents);
      setFeedbackForms(forms.data.feedback || []);
      setPendingParticipationCount(
        Array.isArray(pendingParticipations.data)
          ? pendingParticipations.data.length
          : 0,
      );
      setPendingPaymentCount(
        Array.isArray(pendingPayments.data) ? pendingPayments.data.length : 0,
      );
      setError("");
    } catch (requestError) {
      if (requestId === overviewRequest.current) {
        setError(
          requestError.response?.data?.message ||
            "Some dashboard data could not be loaded.",
        );
      }
    } finally {
      if (requestId === overviewRequest.current) setLoading(false);
    }
  }, []);

  const handleCreateAdmin = async (event) => {
    event.preventDefault();
    if (adminSubmitLock.current) return;

    const normalizedEmail = adminEmail.trim().toLowerCase();
    if (!normalizedEmail || !adminPassword) {
      setAdminError("Enter both an email address and password.");
      setAdminMessage("");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setAdminError("Enter a valid email address.");
      setAdminMessage("");
      return;
    }

    adminSubmitLock.current = true;
    setAdminSubmitting(true);
    setAdminError("");
    setAdminMessage("");
    try {
      const { data } = await createAdminAccount({
        email: normalizedEmail,
        password: adminPassword,
      });
      setAdminMessage(
        data.message || "Administrator account processed successfully.",
      );
      setAdminPassword("");
    } catch (requestError) {
      setAdminError(
        requestError.response?.data?.message ||
          "Could not process the administrator account.",
      );
    } finally {
      adminSubmitLock.current = false;
      setAdminSubmitting(false);
    }
  };

  useEffect(() => {
    void loadOverview();
    socket.on("feedback:admin-changed", loadOverview);
    socket.on("participation:registered", loadOverview);
    socket.on("participation:approval-updated", loadOverview);
    socket.on("payments:updated", loadOverview);
    socket.on("connect", loadOverview);
    return () => {
      socket.off("feedback:admin-changed", loadOverview);
      socket.off("participation:registered", loadOverview);
      socket.off("participation:approval-updated", loadOverview);
      socket.off("payments:updated", loadOverview);
      socket.off("connect", loadOverview);
    };
  }, [loadOverview]);

  const activePolls = pollResults.filter((poll) => poll.status === "Active");
  const stats = [
    {
      id: "students",
      label: "Total Students",
      count: studentCount ?? "—",
      Icon: Users,
      colorClass: "card-total",
    },
    {
      id: "events",
      label: "Total Events",
      count: eventLoading
        ? "…"
        : eventError && events.length === 0
          ? "—"
          : events.length,
      Icon: CalendarDays,
      colorClass: "card-total",
    },
    {
      id: "upcoming",
      label: "Upcoming Events",
      count: eventLoading
        ? "…"
        : eventError && events.length === 0
          ? "—"
          : upcomingEvents.length,
      Icon: CalendarClock,
      colorClass: "card-upcoming",
    },
    {
      id: "ongoing",
      label: "Ongoing Events",
      count: eventLoading
        ? "…"
        : eventError && events.length === 0
          ? "—"
          : ongoingEvents.length,
      Icon: Flame,
      colorClass: "card-ongoing",
    },
    {
      id: "polls",
      label: "Active Polls",
      count: activePolls.length,
      Icon: BarChart3,
      colorClass: "card-polls",
    },
    {
      id: "feedback",
      label: "Feedback Forms",
      count: feedbackForms.length || totalFeedback,
      Icon: MessageSquare,
      colorClass: "card-feedback",
    },
    {
      id: "blogs",
      label: "Total Blogs",
      count: totalBlogs,
      Icon: Newspaper,
      colorClass: "card-blogs",
    },
    {
      id: "completed",
      label: "Completed Events",
      count: eventLoading
        ? "…"
        : eventError && events.length === 0
          ? "—"
          : completedEvents.length,
      Icon: CheckCircle2,
      colorClass: "card-completed",
    },
  ];

  return (
    <div className="dashboard-wrapper admin-dashboard">
      <header className="dashboard-header">
        <div className="header-text">
          <h1 className="dashboard-title">Dashboard Overview</h1>
          <p className="dashboard-subtitle">
            Live event, poll, and feedback activity.
          </p>
        </div>
        <div className="dashboard-actions">
          <EventBtn
            text="Create Event"
            onClick={() => navigate("/create-event")}
            icon={<Plus size={18} />}
          />
          <EventBtn
            text="Create Blog"
            onClick={() => navigate("/post-blog")}
            icon={<Newspaper size={18} />}
          />
          <PollBtn
            text="Create Poll"
            onClick={() => navigate("/create-poll")}
            icon={<Vote size={16} />}
            style={{ backgroundColor: "blue", color: "white" }}
          />
          <EventBtn
            text="Create Feedback"
            onClick={() => navigate("/feedback/create")}
            icon={<MessageSquare size={18} />}
          />
          <EventBtn
            text="Review Payments"
            onClick={() => navigate("/admin/payments")}
            icon={<CreditCard size={18} />}
          />
          <EventBtn
            text={showAdminForm ? "Close Add Admin" : "Add Admin"}
            onClick={() => {
              setShowAdminForm((visible) => !visible);
              if (showAdminForm) setAdminPassword("");
              setAdminError("");
              setAdminMessage("");
            }}
            icon={<UserPlus size={18} />}
            className="admin-add-action"
          />
        </div>
      </header>

      {showAdminForm && (
        <section
          className="admin-create-panel"
          aria-labelledby="admin-create-title"
        >
          <div className="admin-create-copy">
            <h2 id="admin-create-title">Add an administrator</h2>
            <p>
              Use an email and password for a new account, or enter an existing
              account email to promote it. Existing passwords and profile
              details are preserved.
            </p>
          </div>
          <form
            className="admin-create-form"
            onSubmit={handleCreateAdmin}
            noValidate
          >
            <label htmlFor="admin-create-email">Email</label>
            <input
              id="admin-create-email"
              type="email"
              autoComplete="off"
              value={adminEmail}
              onChange={(event) => setAdminEmail(event.target.value)}
              required
            />
            <label htmlFor="admin-create-password">Password</label>
            <input
              id="admin-create-password"
              type="password"
              autoComplete="new-password"
              value={adminPassword}
              onChange={(event) => setAdminPassword(event.target.value)}
              required
            />
            <p className="admin-create-hint">
              For an existing account, the password is required by this form but
              will not replace its current password.
            </p>
            {adminError && (
              <p className="admin-create-feedback error" role="alert">
                {adminError}
              </p>
            )}
            {adminMessage && (
              <p className="admin-create-feedback success" role="status">
                {adminMessage}
              </p>
            )}
            <button
              type="submit"
              className="admin-create-submit"
              disabled={adminSubmitting}
            >
              {adminSubmitting ? "Creating…" : "Create"}
            </button>
          </form>
        </section>
      )}

      {(error || eventError) && <p role="alert">{error || eventError}</p>}
      {(pendingParticipationCount > 0 || pendingPaymentCount > 0) && (
        <section
          className="dashboard-pending-work"
          aria-label="Pending administrative work"
        >
          {pendingParticipationCount > 0 && (
            <Link
              to="/participations"
              className="dashboard-pending-link participation-pending-link"
            >
              <Users size={19} />
              <span>
                <strong>{pendingParticipationCount}</strong> participation{" "}
                {pendingParticipationCount === 1 ? "request" : "requests"}{" "}
                awaiting approval
              </span>
            </Link>
          )}
          {pendingPaymentCount > 0 && (
            <Link
              to="/admin/payments"
              className="dashboard-pending-link payment-pending-link"
            >
              <CreditCard size={19} />
              <span>
                <strong>{pendingPaymentCount}</strong> payment{" "}
                {pendingPaymentCount === 1 ? "submission" : "submissions"}{" "}
                awaiting verification
              </span>
            </Link>
          )}
        </section>
      )}
      <section className="stats-grid" aria-label="EMS summary">
        {stats.map(({ id, label, count, Icon, colorClass }) => (
          <article key={id} className={`stat-card ${colorClass}`}>
            <div className="stat-icon">
              <Icon size={22} strokeWidth={2} />
            </div>
            <div className="stat-info">
              <p>{label}</p>
              <h2>{loading && count === "—" ? "…" : count}</h2>
            </div>
          </article>
        ))}
      </section>

      <div className="admin-overview-grid">
        <section className="content-card">
          <div className="card-header">
            <h2>Ongoing Events</h2>
            <Link to="/ongoing-events">View all</Link>
          </div>
          {ongoingEvents.length ? (
            <ul className="dashboard-record-list">
              {ongoingEvents.slice(0, 5).map((event) => (
                <li key={event._id}>
                  <div>
                    <strong>{event.title}</strong>
                    <span>{new Date(event.start_at).toLocaleString()}</span>
                  </div>
                  <Link to={`/participate/${event._id}`}>Open</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>No events are currently ongoing.</p>
          )}
        </section>
        <section className="content-card">
          <div className="card-header">
            <h2>Active Poll Results</h2>
            <Link to="/polls">Poll management</Link>
          </div>
          {activePolls.length ? (
            activePolls.slice(0, 4).map((poll) => (
              <article className="dashboard-poll-summary" key={poll._id}>
                <h3>{poll.question}</h3>
                <p>{poll.totalVotes} votes</p>
                {poll.results.map((result) => (
                  <p key={result.option}>
                    {result.option}: {result.votes}
                    {poll.totalVotes
                      ? ` · ${((result.votes / poll.totalVotes) * 100).toFixed(1)}%`
                      : ""}
                  </p>
                ))}
                <Link to={`/edit-poll/${poll._id}`}>Manage poll</Link>
              </article>
            ))
          ) : (
            <p>No active polls.</p>
          )}
        </section>
        <section className="content-card admin-feedback-overview">
          <div className="card-header">
            <h2>Feedback Forms</h2>
            <Link to="/feedback-forms">View all</Link>
          </div>
          {loading ? (
            <p>Loading feedback forms…</p>
          ) : feedbackForms.length ? (
            <ul className="dashboard-record-list">
              {feedbackForms.slice(0, 5).map((form) => (
                <li key={form._id}>
                  <div>
                    <strong>{form.title}</strong>
                    <span>
                      {form.event?.title || "Event unavailable"} ·{" "}
                      {form.isPublished ? "Published" : "Draft"} ·{" "}
                      {form.responseCount || 0} responses
                    </span>
                  </div>
                  <Link to={`/feedback-forms/${form._id}`}>Responses</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>No feedback forms yet.</p>
          )}
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;
