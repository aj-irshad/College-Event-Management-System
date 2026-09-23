import { useContext, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import eventContext from "../../context/EventContext";
import blogContext from "../../context/blogContext";

import "../searchPage.css";

const SearchPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const query = searchParams.get("q")?.toLowerCase() || "";

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

  return (
    <section className="searchPage">
      {/* Search Header */}
      <header className="searchPageHeader">
        <h1>Search Results</h1>

        <p>
          Results for: <strong className="searchQuery">{query}</strong>
        </p>
      </header>

      {/* Event Results */}
      <section className="searchSection">
        <h2 className="searchSectionTitle">Events</h2>

        {eventResults.length > 0 ? (
          <div className="searchResults">
            {eventResults.map((event) => (
              <article
                key={event._id}
                className="searchResultCard"
                onClick={() => navigate("/upcoming-events")}
              >
                <h3>{event.title}</h3>

                <p>{event.description}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="noResults">No events found.</p>
        )}
      </section>

      {/* Blog Results */}
      <section className="searchSection">
        <h2 className="searchSectionTitle">Blogs</h2>

        {blogResults.length > 0 ? (
          <div className="searchResults">
            {blogResults.map((blog) => (
              <article
                key={blog._id}
                className="searchResultCard"
                onClick={() => navigate(`/blogs/${blog._id}`)}
              >
                <h3>{blog.title}</h3>

                <p>{blog.description}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="noResults">No blogs found.</p>
        )}
      </section>
    </section>
  );
};

export default SearchPage;
