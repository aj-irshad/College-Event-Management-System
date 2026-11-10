import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  Clock,
  CheckCircle2,
  Users,
  BookOpen,
  MessageSquareText,
  FileSpreadsheet,
  BarChart3,
} from "lucide-react";
import "../styles/aside.css";
import LogoutButton from "./auth/LogoutButton";

const Aside = ({ isAdmin, isOpen, onClose }) => {
  return (
    <aside className={`appSidebar ${isOpen ? "open" : ""}`}>
      {/* 1. Fixed Header Section */}
      <div className="sidebarHeader">
        <div className="sidebarLogoIcon">
          <LayoutDashboard size={20} />
        </div>
        <div className="sidebarBrandText">
          <h2>{isAdmin ? "Admin Portal" : "Campus Hub"}</h2>
          <span>{isAdmin ? "Management System" : "Student Dashboard"}</span>
        </div>
      </div>

      {/* 2. Scrollable Navigation Links Section */}
      <nav className="sidebarNav">
        <NavLink
          to="/"
          title={isAdmin ? "Dashboard" : "Home"}
          end
          onClick={onClose}
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <LayoutDashboard size={18} />
          <span>{isAdmin ? "Dashboard" : "Home"}</span>
        </NavLink>

        <NavLink to="/upcoming-events" title="Upcoming Events" onClick={onClose}>
          <CalendarDays size={18} />
          <span>Upcoming Events</span>
        </NavLink>

        <NavLink to="/ongoing-events" title="Ongoing Events" onClick={onClose}>
          <Clock size={18} />
          <span>Ongoing Events</span>
        </NavLink>

        <NavLink to="/completed-events" title="Completed Events" onClick={onClose}>
          <CheckCircle2 size={18} />
          <span>Completed Events</span>
        </NavLink>

        <NavLink to="/participations" title={isAdmin ? "Participants" : "Participations"} onClick={onClose}>
          <Users size={18} />
          <span>{isAdmin ? "Participants" : "Participations"}</span>
        </NavLink>

        <NavLink to="/blogs" title="Blogs" onClick={onClose}>
          <BookOpen size={18} />
          <span>Blogs</span>
        </NavLink>

        <NavLink to="/feedback" title={isAdmin ? "User Feedbacks" : "Feedback"} onClick={onClose}>
          <MessageSquareText size={18} />
          <span>{isAdmin ? "User Feedbacks" : "Feedback"}</span>
        </NavLink>

        {isAdmin && (
          <NavLink to="/feedback-forms" title="Feedback Forms" onClick={onClose}>
            <FileSpreadsheet size={18} />
            <span>Feedback Forms</span>
          </NavLink>
        )}

        <NavLink to="/polls" title="Polls" onClick={onClose}>
          <BarChart3 size={18} />
          <span>Polls</span>
        </NavLink>
      </nav>

      {/* 3. Pinned Footer / Logout Section */}
      <div className="sidebarFooter" onClick={onClose}>
        <LogoutButton />
      </div>
    </aside>
  );
};

export default Aside;
