import { Search, Bell } from "lucide-react";
import "../styles/header.css";

const Header = ({ user }) => {
  return (
    <header className="header">
      <form className="searchBar">
        <input
          type="text"
          placeholder="Search event's blogs"
          className="searchInput"
        />
        <Search className="searchIcon" />
        {/* <button className="searchBtn">Search event's blogs</button> */}
      </form>
      <section className="user">
        <Bell />
        <img
          src={`${import.meta.env.VITE_BASE_URL}/uploads/user/${user.profileImage}`}
          alt={`${user.name}'s image`}
          className="userImage"
        />
        <article className="profile">
          <p className="userName">Hi, {user.name}</p>
          <p className="department">{user.department}</p>
        </article>
      </section>
    </header>
  );
};

export default Header;
