import { NavLink } from "react-router-dom";
import "../styles/aside.css";
import LogoutButton from "./auth/LogoutButton";

const Aside = ({ isAdmin }) => {
  return (
    <aside>
      <NavLink to="/" end>
        {isAdmin ? "Dashboard" : "Home"}
      </NavLink>
      <NavLink to="/upcoming-events">Upcoming Events</NavLink>
      <NavLink to="/ongoing-events">Ongoing Events</NavLink>
      <NavLink to="/blogs">Blogs</NavLink>
      <NavLink to="/feedback">Feedback</NavLink>
      <NavLink to="/polls">Polls</NavLink>
      {/* <NavLink to="/logout">Logout</NavLink>
       */}
      <LogoutButton />
    </aside>
  );
};

export default Aside;
