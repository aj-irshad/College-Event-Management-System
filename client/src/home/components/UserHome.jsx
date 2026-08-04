import {
  Calendar,
  Flame,
  Vote,
  BookOpen,
  ArrowUpRight,
  Clock,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import "../styles/userDashboard.css";

// 1. Metric stats updated for user context (Polls & Blogs replacing Users & Feedback)
const userStats = [
  {
    id: "upcoming",
    label: "Upcoming Events",
    count: 3,
    Icon: Calendar,
    colorClass: "card-upcoming",
  },
  {
    id: "ongoing",
    label: "Ongoing Events",
    count: 1,
    Icon: Flame,
    colorClass: "card-ongoing",
  },
  {
    id: "polls",
    label: "Active Polls",
    count: 4,
    Icon: Vote,
    colorClass: "card-polls",
  },
  {
    id: "blogs",
    label: "Saved Blogs",
    count: 12,
    Icon: BookOpen,
    colorClass: "card-blogs",
  },
];

// 2. Upcoming events user has registered for or recommended events
const registeredEvents = [
  {
    id: 1,
    name: "Tech Innovators Summit",
    date: "Aug 12, 2026",
    time: "10:00 AM",
    location: "Main Auditorium",
    status: "Confirmed",
  },
  {
    id: 2,
    name: "Design Workshop 2026",
    date: "Aug 15, 2026",
    time: "02:00 PM",
    location: "Online / Zoom",
    status: "Waitlisted",
  },
  {
    id: 3,
    name: "AI & Future Dev Conference",
    date: "Aug 20, 2026",
    time: "09:00 AM",
    location: "Hall B",
    status: "Confirmed",
  },
];

// Mock user data object (Pass via props or global context in production)
const UserDashboard = ({ user = { name: "Error" } }) => {
  return (
    <div className="dashboard-wrapper">
      {/* Section 1: User Header */}
      <header className="dashboard-header">
        <div className="header-text">
          <h1 className="dashboard-title">Welcome back, {user.name}!</h1>
          <p className="dashboard-subtitle">
            Stay updated on your upcoming schedules, community polls, and latest
            posts.
          </p>
        </div>
      </header>

      {/* Section 2: Cards (Upcoming, Ongoing, Polls, Blogs) */}
      <section className="cards-grid">
        {userStats.map(({ id, label, count, Icon, colorClass }) => (
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

      {/* Section 3: Main Layout - Upcoming Events Table & Quick Feed */}
      <div className="dashboard-content-grid">
        {/* Left Column: Upcoming Events Table */}
        <section className="content-card">
          <div className="card-header">
            <h2>Your Upcoming Events</h2>
            <button className="text-btn">
              Explore All <ArrowUpRight size={16} />
            </button>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Event Name</th>
                <th>Date & Time</th>
                <th>Location</th>
                <th>RSVP Status</th>
              </tr>
            </thead>
            <tbody>
              {registeredEvents.map((evt) => (
                <tr key={evt.id}>
                  <td className="font-semibold">{evt.name}</td>
                  <td>
                    <div className="table-time-cell">
                      <span>{evt.date}</span>
                      <span className="sub-time">
                        <Clock size={12} /> {evt.time}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="table-location-cell">
                      <MapPin size={14} className="text-muted" /> {evt.location}
                    </div>
                  </td>
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

        {/* Right Column: Community Updates */}
        <section className="content-card">
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
        </section>
      </div>
    </div>
  );
};

export default UserDashboard;
