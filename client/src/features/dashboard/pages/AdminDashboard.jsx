import { useCallback, useContext, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CalendarClock, Flame, CheckCircle2, Newspaper, BarChart3,
  MessageSquare, CalendarDays, Plus, Vote, CreditCard, Users,
} from "lucide-react";

import EventBtn from "../../events/components/EventBtn";
import PollBtn from "../../polls/components/PollBtn.jsx";
import eventContext from "../../../context/EventContext.jsx";
import blogContext from "../../../context/blogContext.jsx";
import feedbackContext from "../../../context/feedbackContext.jsx";
import pollContext from "../../../context/pollContext.jsx";
import { fetchAdminFeedbackForms } from "../../../services/feedbackService.js";
import apiRequest from "../../../api/apiRequest.js";
import socket from "../../../api/socket.js";
import "../styles/adminDashboard.css";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { events, upcomingEvents, ongoingEvents, completedEvents } = useContext(eventContext);
  const { totalBlogs } = useContext(blogContext);
  const { totalFeedback } = useContext(feedbackContext);
  const { totalPolls, pollResults } = useContext(pollContext);
  const [studentCount, setStudentCount] = useState(null);
  const [feedbackForms, setFeedbackForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadOverview = useCallback(async () => {
    try {
      const [users, forms] = await Promise.all([
        apiRequest.get("/user/admin/student-count"),
        fetchAdminFeedbackForms(),
      ]);
      setStudentCount(users.data.totalStudents);
      setFeedbackForms(forms.data.feedback || []);
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Some dashboard data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
    socket.on("feedback:admin-changed", loadOverview);
    socket.on("connect", loadOverview);
    return () => {
      socket.off("feedback:admin-changed", loadOverview);
      socket.off("connect", loadOverview);
    };
  }, [loadOverview]);

  const activePolls = pollResults.filter((poll) => poll.status === "Active");
  const stats = [
    { id: "students", label: "Total Students", count: studentCount ?? "—", Icon: Users, colorClass: "card-total" },
    { id: "events", label: "Total Events", count: events.length, Icon: CalendarDays, colorClass: "card-total" },
    { id: "upcoming", label: "Upcoming Events", count: upcomingEvents.length, Icon: CalendarClock, colorClass: "card-upcoming" },
    { id: "ongoing", label: "Ongoing Events", count: ongoingEvents.length, Icon: Flame, colorClass: "card-ongoing" },
    { id: "polls", label: "Active Polls", count: activePolls.length, Icon: BarChart3, colorClass: "card-polls" },
    { id: "feedback", label: "Feedback Forms", count: feedbackForms.length || totalFeedback, Icon: MessageSquare, colorClass: "card-feedback" },
    { id: "blogs", label: "Total Blogs", count: totalBlogs, Icon: Newspaper, colorClass: "card-blogs" },
    { id: "completed", label: "Completed Events", count: completedEvents.length, Icon: CheckCircle2, colorClass: "card-completed" },
  ];

  return (
    <div className="dashboard-wrapper admin-dashboard">
      <header className="dashboard-header">
        <div className="header-text">
          <h1 className="dashboard-title">Dashboard Overview</h1>
          <p className="dashboard-subtitle">Live event, poll, and feedback activity.</p>
        </div>
        <div className="dashboard-actions">
          <EventBtn text="Create Event" onClick={() => navigate("/create-event")} icon={<Plus size={18} />} />
          <EventBtn text="Create Blog" onClick={() => navigate("/post-blog")} icon={<Newspaper size={18} />} />
          <PollBtn text="Create Poll" onClick={() => navigate("/create-poll")} icon={<Vote size={16} />} style={{ backgroundColor: "blue", color: "white" }} />
          <EventBtn text="Create Feedback" onClick={() => navigate("/feedback/create")} icon={<MessageSquare size={18} />} />
          <EventBtn text="Review Payments" onClick={() => navigate("/admin/payments")} icon={<CreditCard size={18} />} />
        </div>
      </header>

      {error && <p role="alert">{error}</p>}
      <section className="stats-grid" aria-label="EMS summary">
        {stats.map(({ id, label, count, Icon, colorClass }) => (
          <article key={id} className={`stat-card ${colorClass}`}>
            <div className="stat-icon"><Icon size={22} strokeWidth={2} /></div>
            <div className="stat-info"><p>{label}</p><h2>{loading && count === "—" ? "…" : count}</h2></div>
          </article>
        ))}
      </section>

      <div className="admin-overview-grid">
        <section className="content-card">
          <div className="card-header"><h2>Ongoing Events</h2><Link to="/ongoing-events">View all</Link></div>
          {ongoingEvents.length ? <ul className="dashboard-record-list">{ongoingEvents.slice(0, 5).map((event) => <li key={event._id}>
            <div><strong>{event.title}</strong><span>{new Date(event.start_at).toLocaleString()}</span></div>
            <Link to={`/participate/${event._id}`}>Open</Link>
          </li>)}</ul> : <p>No events are currently ongoing.</p>}
        </section>
        <section className="content-card">
          <div className="card-header"><h2>Active Poll Results</h2><Link to="/polls">Poll management</Link></div>
          {activePolls.length ? activePolls.slice(0, 4).map((poll) => <article className="dashboard-poll-summary" key={poll._id}>
            <h3>{poll.question}</h3><p>{poll.totalVotes} votes</p>
            {poll.results.map((result) => <p key={result.option}>{result.option}: {result.votes}{poll.totalVotes ? ` · ${(result.votes / poll.totalVotes * 100).toFixed(1)}%` : ""}</p>)}
            <Link to={`/edit-poll/${poll._id}`}>Manage poll</Link>
          </article>) : <p>No active polls.</p>}
        </section>
        <section className="content-card admin-feedback-overview">
          <div className="card-header"><h2>Feedback Forms</h2><Link to="/feedback-forms">View all</Link></div>
          {loading ? <p>Loading feedback forms…</p> : feedbackForms.length ? <ul className="dashboard-record-list">{feedbackForms.slice(0, 5).map((form) => <li key={form._id}>
            <div><strong>{form.title}</strong><span>{form.event?.title || "Event unavailable"} · {form.isPublished ? "Published" : "Draft"} · {form.responseCount || 0} responses</span></div>
            <Link to={`/feedback-forms/${form._id}`}>Responses</Link>
          </li>)}</ul> : <p>No feedback forms yet.</p>}
        </section>
      </div>
    </div>
  );
};

export default AdminDashboard;
