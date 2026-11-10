import {
  Calendar,
  Flame,
  Vote,
  BookOpen,
  ArrowUpRight,
} from "lucide-react";

import { useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import eventContext from "../../../context/EventContext";
import blogContext from "../../../context/blogContext";
import pollContext from "../../../context/pollContext.jsx";

import StaticCard from "../components/StaticCard";
import EventTable from "../components/EventTable";

import "../styles/userDashboard.css";

// Upcoming registered events

const UserDashboard = ({ user = { name: "User" } }) => {
  const navigate = useNavigate();
  const { events, upcomingEvents, ongoingEvents } = useContext(eventContext);
  const { blogs, totalBlogs } = useContext(blogContext);
  const { pollForm } = useContext(pollContext);
  const activePolls = pollForm.filter((poll) => poll.status === "Active");
  const recentItems = useMemo(() => [
    ...events.map((item) => ({ id: item._id, type: "Event", title: item.title, date: item.createdAt || item.start_at, to: `/participate/${item._id}` })),
    ...blogs.map((item) => ({ id: item._id, type: "Blog", title: item.title, date: item.createdAt, to: `/blogs/${item._id}` })),
    ...pollForm.map((item) => ({ id: item._id, type: "Poll", title: item.question, date: item.createdAt, to: `/polls?poll=${item._id}` })),
  ].filter((item) => Number.isFinite(new Date(item.date).getTime()))
    .sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8),
  [events, blogs, pollForm]);

  return (
    <div className="dashboard-wrapper">
      {/* Section 1: User Header */}
      <header className="dashboard-header" style={{ padding: "1rem" }}>
        <div className="header-text">
          <h1 className="dashboard-title">Welcome back, {user.name}!</h1>

          <p className="dashboard-subtitle">
            Stay updated on your upcoming schedules, community polls, and latest
            posts.
          </p>
        </div>
      </header>

      {/* Section 2: Statistics Cards */}
      <section className="cards-grid">
        {/* Upcoming Events */}
        <StaticCard
          icon={<Calendar size={22} />}
          count={upcomingEvents.length}
          cardName="Upcoming Events"
        />

        {/* Ongoing Events */}
        <StaticCard
          icon={<Flame size={22} />}
          count={ongoingEvents.length}
          cardName="Ongoing Events"
        />

        {/* Active Polls */}
        <StaticCard
          icon={<Vote size={22} />}
          count={activePolls.length}
          cardName="Active Polls"
        />

        {/* Saved Blogs */}
        <StaticCard
          icon={<BookOpen size={22} />}
          count={totalBlogs}
          cardName="Blogs"
        />
      </section>

      <div className="dashboard-content-grid">
        <section className="content-card">
          <div className="card-header">
            <h2>Your Upcoming Events</h2>

            <button
              className="text-btn"
              onClick={() => navigate("/upcoming-events")}
            >
              Explore All
              <ArrowUpRight size={16} />
            </button>
          </div>

          <EventTable events={upcomingEvents} />
        </section>
        <section className="content-card">
          <div className="card-header">
            <h2>Recent Activity</h2>
          </div>
          {recentItems.length ? <ul className="activity-list">{recentItems.map((item) => <li className="activity-item" key={`${item.type}-${item.id}`}>
            <div><p className="activity-title">{item.type}: {item.title}</p><span className="activity-time">{new Date(item.date).toLocaleString()}</span></div>
            <button type="button" className="text-btn" onClick={() => navigate(item.to)}>Open</button>
          </li>)}</ul> : <p>No recent activity is available.</p>}
        </section>
      </div>
    </div>
  );
};

export default UserDashboard;
