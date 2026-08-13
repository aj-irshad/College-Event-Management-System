import {
  Calendar,
  Flame,
  UsersRound,
  Star,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";

import CreateEventBtn from "../components/CreateEventBtn";
import EventCards from "../components/EventCards";
import "../styles/adminDashboard.css";
import RecentEvent from "../components/RecentEvent";
import RecentActivity from "../components/RecentActivity";

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

const AdminDashboard = () => {
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
        <CreateEventBtn />
      </header>

      {/* Top Metric Cards */}
      <section className="cards-grid">
        {stats.map(({ id, label, count, Icon, colorClass }) => (
          <EventCards
            id={id}
            label={label}
            Icon={Icon}
            colorClass={colorClass}
            count={count}
          />
        ))}
      </section>

      <div className="dashboard-content-grid">
        <RecentEvent recentEvents={recentEvents} ArrowUpRight={ArrowUpRight} />
        {/* <RecentEvent ArrowUpRight={ArrowUpRight} /> */}
        {/* Right Column: Recent Activity Feed */}
        <RecentActivity CheckCircle2={CheckCircle2} />
      </div>
    </div>
  );
};

export default AdminDashboard;
