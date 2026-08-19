import {
  Calendar,
  Flame,
  Vote,
  BookOpen,
  ArrowUpRight,
  // CheckCircle2,
} from "lucide-react";

import { useContext } from "react";
import { useNavigate } from "react-router-dom";

import eventContext from "../../../context/EventContext";
import StaticCard from "../components/StaticCard";

import "../styles/userDashboard.css";
import EventTable from "../components/EventTable";

// Upcoming registered events

const UserDashboard = ({ user = { name: "User" } }) => {
  const navigate = useNavigate();
  const { upcomingEvents, ongoingEvents } = useContext(eventContext);

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
          count={upcomingEvents}
          cardName="Upcoming Events"
        />

        {/* Ongoing Events */}
        <StaticCard
          icon={<Flame size={22} />}
          count={ongoingEvents}
          cardName="Ongoing Events"
        />

        {/* Active Polls */}
        <StaticCard
          icon={<Vote size={22} />}
          // count={4}
          cardName="Active Polls"
        />

        {/* Saved Blogs */}
        <StaticCard
          icon={<BookOpen size={22} />}
          //  count={12}
          cardName="Blogs"
        />
      </section>

      {/* Section 3: Main Dashboard Content */}
      <div className="dashboard-content-grid">
        {/* Left Column: Upcoming Events */}
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

        {/* Right Column: Community Feed */}
        {/* <section className="content-card">
          <div className="card-header">
            <h2>Community Feed</h2>
          </div>

          <ul className="activity-list">
            <li className="activity-item">
              <CheckCircle2 size={18} className="activity-icon text-purple" />

              <div>
                <p className="activity-title">
                  New poll added: "Preferred Tech Stack for 2027?"
                </p>

                <span className="activity-time">2 hours ago</span>
              </div>
            </li>

            <li className="activity-item">
              <CheckCircle2 size={18} className="activity-icon text-blue" />

              <div>
                <p className="activity-title">
                  Your ticket for "Tech Summit" was verified.
                </p>

                <span className="activity-time">Yesterday</span>
              </div>
            </li>

            <li className="activity-item">
              <CheckCircle2 size={18} className="activity-icon text-green" />

              <div>
                <p className="activity-title">
                  New blog post: "Mastering React 19 Layouts"
                </p>

                <span className="activity-time">2 days ago</span>
              </div>
            </li>
          </ul>
        </section> */}
      </div>
    </div>
  );
};

export default UserDashboard;
