import { useContext, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import eventContext from "../../context/EventContext";
import blogContext from "../../context/blogContext";

import "../searchPage.css";

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const query = searchParams.get("q")?.toLowerCase() || "";
  const [filter, setFilter] = useState("All");

  const { events } = useContext(eventContext);
  const { blogs } = useContext(blogContext);

  const eventResults = useMemo(() => {
    return events.filter((event) =>
      `${event.title} ${event.description} ${event.event_type} ${event.venue}`
        .toLowerCase()
        .includes(query),
    );
  }, [events, query]);

  const blogResults = useMemo(() => {
    return blogs.filter((blog) =>
      `${blog.title} ${blog.description}`.toLowerCase().includes(query),
    );
  }, [blogs, query]);

  const results = [
    ...(filter !== "Blogs" ? eventResults.map((event) => ({ ...event, kind: "event" })) : []),
    ...(filter !== "Events" ? blogResults.map((blog) => ({ ...blog, kind: "blog" })) : []),
  ];

  return (
    <section className="searchPage">
      {/* Search Header */}
      <header className="searchPageHeader">
        <h1>Search Results</h1>

        <p>
          Results for: <strong className="searchQuery">{query}</strong>
        </p>
      </header>

      <nav className="searchFilters" aria-label="Filter search results">
        {["All", "Events", "Blogs"].map((option) => (
          <button key={option} type="button" aria-pressed={filter === option} onClick={() => setFilter(option)}>
            {option}
          </button>
        ))}
      </nav>

      {!query ? <p className="noResults">Enter a search term to find events and blogs.</p> : results.length ? (
        <section className="searchResults">
          {results.map((item) => (
            <article
              key={`${item.kind}-${item._id}`}
              className="searchResultCard"
              role="link"
              tabIndex={0}
              onClick={() => navigate(item.kind === "event" ? `/participate/${item._id}` : `/blogs/${item._id}`)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  navigate(item.kind === "event" ? `/participate/${item._id}` : `/blogs/${item._id}`);
                }
              }}
            >
              <span>{item.kind === "event" ? "Event" : "Blog"}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </section>
      ) : <p className="noResults">No matching {filter === "All" ? "events or blogs" : filter.toLowerCase()} found.</p>}
    </section>
  );
};

export default SearchPage;
