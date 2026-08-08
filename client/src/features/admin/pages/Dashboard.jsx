import {
  Calendar,
  Flame,
  UsersRound,
  Star,
  Plus,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";
import "../styles/dashboard.css";

import { useNavigate } from "react-router-dom";
const stats = [
  {
    id: "upcoming",
    label: "Upcoming Events",
    count: 5,
    Icon: Calendar,
    colorClass: "card-upcoming",
  },
  {
    id: "ongoing",
    label: "Ongoing Events",
    count: 2,
    Icon: Flame,
    colorClass: "card-ongoing",
  },
  {
    id: "users",
    label: "Total Users",
    count: 50,
    Icon: UsersRound,
    colorClass: "card-users",
  },
  {
    id: "feedback",
    label: "Total Feedback",
    count: 15,
    Icon: Star,
    colorClass: "card-feedback",
  },
];

const recentEvents = [
  {
    id: 1,
    name: "Tech Innovators Summit",
    date: "Aug 12, 2026",
    attendees: 120,
    status: "Upcoming",
  },
  {
    id: 2,
    name: "Design Workshop 2026",
    date: "Aug 06, 2026",
    attendees: 45,
    status: "Ongoing",
  },
  {
    id: 3,
    name: "AI & Future Dev Conference",
    date: "Aug 20, 2026",
    attendees: 200,
    status: "Upcoming",
  },
];

const Dashboard = () => {
  const navigate = useNavigate();
  return (
    <div className="dashboard-wrapper">
      {/* Top Header */}
      <header className="dashboard-header">
        <div className="header-text">
          <h1 className="dashboard-title">Dashboard Overview</h1>
          <p className="dashboard-subtitle">
            Welcome back! Here's what's happening today.
          </p>
        </div>
        <button
          className="primary-btn"
          onClick={() => navigate("/create-event")}
        >
          <Plus size={18} /> Create Event
        </button>
      </header>

      {/* Top Metric Cards */}
      <section className="cards-grid">
        {stats.map(({ id, label, count, Icon, colorClass }) => (
          <article key={id} className={`stat-card ${colorClass}`}>
            <div className="icon-wrapper">
              <Icon size={22} />
            </div>
            <div className="stat-content">
              <span className="stat-count">{count}</span>
              <p className="stat-label">{label}</p>
            </div>
          </article>
        ))}
      </section>

      {/* Main Content Grid */}
      <div className="dashboard-content-grid">
        {/* Left/Main Column: Event Table */}
        <section className="content-card">
          <div className="card-header">
            <h2>Active & Upcoming Events</h2>
            <button className="text-btn">
              View All <ArrowUpRight size={16} />
            </button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Event Name</th>
                <th>Date</th>
                <th>Attendees</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentEvents.map((evt) => (
                <tr key={evt.id}>
                  <td className="font-semibold">{evt.name}</td>
                  <td>{evt.date}</td>
                  <td>{evt.attendees}</td>
                  <td>
                    <span
                      className={`status-badge ${evt.status.toLowerCase()}`}
                    >
                      {evt.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Right Column: Recent Activity Feed */}
        <section className="content-card">
          <div className="card-header">
            <h2>Recent Activity</h2>
          </div>
          <ul className="activity-list">
            <li className="activity-item">
              <CheckCircle2 size={18} className="activity-icon text-blue" />
              <div>
                <p className="activity-title">New feedback received</p>
                <span className="activity-time">10 minutes ago</span>
              </div>
            </li>
            <li className="activity-item">
              <CheckCircle2 size={18} className="activity-icon text-green" />
              <div>
                <p className="activity-title">5 new users registered</p>
                <span className="activity-time">1 hour ago</span>
              </div>
            </li>
            <li className="activity-item">
              <CheckCircle2 size={18} className="activity-icon text-orange" />
              <div>
                <p className="activity-title">
                  "Design Workshop" status changed to Ongoing
                </p>
                <span className="activity-time">3 hours ago</span>
              </div>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
