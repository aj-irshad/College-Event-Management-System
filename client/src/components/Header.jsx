import { Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import "../styles/header.css";

const Header = ({ user }) => {
  const navigate = useNavigate();

  const [search, setSearch] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();

    const query = search.trim();

    if (!query) return;

    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <header className="header">
      <form className="searchBar" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search events or blogs"
          className="searchInput"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search events or blogs"
        />

        <button type="submit" className="searchBtn" aria-label="Search">
          <Search size={19} />
        </button>
      </form>

      <section className="userProfile">
        <img
          src={`${import.meta.env.VITE_BASE_URL}/uploads/user/${user.profileImage}`}
          alt={`${user.name}'s profile`}
          className="userImage"
        />

        <article className="profileInfo">
          <p className="userName">Hi, {user.name}</p>

          <p className="department">{user.department}</p>
        </article>
      </section>
    </header>
  );
};

export default Header;
