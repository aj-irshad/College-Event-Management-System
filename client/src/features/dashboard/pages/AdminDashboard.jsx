import {
  CalendarClock,
  Flame,
  CheckCircle2,
  Newspaper,
  BarChart3,
  MessageSquare,
  CalendarDays,
  Plus,
} from "lucide-react";

import { useContext } from "react";
import { useNavigate } from "react-router-dom";

import EventBtn from "../../events/components/EventBtn";
import eventContext from "../../../context/EventContext.jsx";

import "../styles/adminDashboard.css";

const AdminDashboard = () => {
  const navigate = useNavigate();

  const { events, upcomingEvents, ongoingEvents, completedEvents } =
    useContext(eventContext);

  const stats = [
    {
      id: "upcoming",
      label: "Upcoming Events",
      count: upcomingEvents.length,
      Icon: CalendarClock,
      colorClass: "card-upcoming",
    },
    {
      id: "ongoing",
      label: "Ongoing Events",
      count: ongoingEvents.length,
      Icon: Flame,
      colorClass: "card-ongoing",
    },
    {
      id: "completed",
      label: "Completed Events",
      count: completedEvents.length,
      Icon: CheckCircle2,
      colorClass: "card-completed",
    },
    {
      id: "blogs",
      label: "Total Blogs",
      count: 0,
      Icon: Newspaper,
      colorClass: "card-blogs",
    },
    {
      id: "polls",
      label: "Total Polls",
      count: 0,
      Icon: BarChart3,
      colorClass: "card-polls",
    },
    {
      id: "feedback",
      label: "Total Feedback",
      count: 0,
      Icon: MessageSquare,
      colorClass: "card-feedback",
    },
    {
      id: "events",
      label: "Total Events",
      count: events.length,
      Icon: CalendarDays,
      colorClass: "card-total",
    },
  ];

  return (
    <div className="dashboard-wrapper">
      <header className="dashboard-header">
        <div className="header-text">
          <h1 className="dashboard-title">Dashboard Overview</h1>

          <p className="dashboard-subtitle">
            Welcome back! Here's what's happening today.
          </p>
        </div>

        <EventBtn
          text="Create Event"
          onClick={() => navigate("/create-event")}
          icon={<Plus size={18} />}
        />
      </header>

      <section className="stats-grid">
        {stats.map(({ id, label, count, Icon, colorClass }) => (
          <article key={id} className={`stat-card ${colorClass}`}>
            <div className="stat-icon">
              <Icon size={22} strokeWidth={2} />
            </div>

            <div className="stat-info">
              <p>{label}</p>
              <h2>{count}</h2>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
};

export default AdminDashboard;
