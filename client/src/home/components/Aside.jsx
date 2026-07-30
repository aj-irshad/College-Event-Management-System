import { Link } from "react-router-dom";

const Aside = () => {
  return (
    <aside>
      <Link to="/">Home</Link>
      <Link to="/upcoming-events">Upcoming Events</Link>
      <Link to="/ongoing-events">Ongoing Events</Link>
      <Link to="/blogs">Blog</Link>
      <Link to="/feedback">Feedback</Link>
      <Link to="/polls">Polls</Link>
      <Link to="/logout">Logout</Link>
    </aside>
  );
};

export default Aside;
