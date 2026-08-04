import { useState } from "react";
import {
  Flame,
  Clock,
  MapPin,
  UsersRound,
  ArrowUpRight,
  Radio,
  Search,
} from "lucide-react";
import "../styles/ongoingEvents.css";

// Dummy data for currently active events
const mockOngoingEvents = [
  {
    id: "evt-101",
    name: "Design Workshop 2026",
    type: "Workshop",
    venue: "Studio Room 3 & Zoom Stream",
    attendees: 45,
    maxCapacity: 60,
    startedAt: "10:00 AM",
    endsAt: "04:00 PM",
    progress: "60%",
    host: "UI/UX Guild",
  },
  {
    id: "evt-102",
    name: "AI & Cloud Architecture Live Q&A",
    type: "Webinar",
    venue: "Main Stage / Live Stream",
    attendees: 180,
    maxCapacity: 300,
    startedAt: "11:30 AM",
    endsAt: "01:30 PM",
    progress: "80%",
    host: "DevOps Team",
  },
];

const OngoingEvents = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredEvents = mockOngoingEvents.filter(
    (evt) =>
      evt.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evt.type.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="ongoing-wrapper">
      {/* Top Header */}
      <header className="ongoing-header">
        <div className="header-text">
          <div className="live-title-badge">
            <h1 className="dashboard-title">Ongoing Events</h1>
            <span className="live-indicator">
              <span className="pulse-dot"></span> LIVE
            </span>
          </div>
          <p className="dashboard-subtitle">
            Events happening right now. Monitor active sessions and attendee
            activity.
          </p>
        </div>

        {/* Quick Search */}
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search active events..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      {/* Main Events Grid */}
      <section className="ongoing-cards-grid">
        {filteredEvents.length > 0 ? (
          filteredEvents.map((evt) => (
            <article key={evt.id} className="content-card ongoing-card">
              <div className="ongoing-card-top">
                <span className="event-type-badge">{evt.type}</span>
                <span className="status-badge ongoing">
                  <Radio size={12} className="pulse-icon" /> Happening Now
                </span>
              </div>

              <h2 className="event-card-title">{evt.name}</h2>
              <p className="event-host">Hosted by {evt.host}</p>

              <div className="event-details-list">
                <div className="detail-item">
                  <MapPin size={16} className="text-muted" />
                  <span>{evt.venue}</span>
                </div>
                <div className="detail-item">
                  <Clock size={16} className="text-muted" />
                  <span>
                    {evt.startedAt} - {evt.endsAt}
                  </span>
                </div>
                <div className="detail-item">
                  <UsersRound size={16} className="text-muted" />
                  <span>
                    {evt.attendees} / {evt.maxCapacity} Checked-in
                  </span>
                </div>
              </div>

              {/* Live Session Progress Bar */}
              <div className="progress-section">
                <div className="progress-label">
                  <span>Session Progress</span>
                  <span className="font-semibold">{evt.progress}</span>
                </div>
                <div className="progress-bar-bg">
                  <div
                    className="progress-bar-fill"
                    style={{ width: evt.progress }}
                  ></div>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="content-card empty-state">
            <Flame size={32} className="empty-icon" />
            <h3>No Live Events Found</h3>
            <p className="dashboard-subtitle">
              There are no active events matching your filter right now.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};

export default OngoingEvents;
