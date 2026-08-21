import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";

import blogContext from "../../../context/blogContext";
import authContext from "../../../context/authContext";
import BlogList from "../components/BlogList";

import "../style/blogs.css";

const Blogs = () => {
  const navigate = useNavigate();

  const { isAdmin } = useContext(authContext);
  const { blogs } = useContext(blogContext);

  return (
    <main className="blogs-page">
      <header className="blogs-header">
        <div className="blogs-header-content">
          <p className="blogs-eyebrow">Campus Stories</p>

          <h1 className="blogs-title">Blog</h1>

          <p className="blogs-subtitle">
            Discover the latest stories, updates, and events from our college
            community.
          </p>
        </div>

        {isAdmin && (
          <button
            className="create-blog-btn"
            onClick={() => navigate("/post-blog")}
          >
            <Plus size={19} />
            Create Blog
          </button>
        )}
      </header>

      {blogs.length > 0 ? (
        <section className="blogs-grid">
          {blogs.map((blog) => (
            <BlogList blog={blog} key={blog._id} isAdmin={isAdmin} />
          ))}
        </section>
      ) : (
        <section className="empty-blog-state">
          <div className="empty-blog-icon">✦</div>

          <h2>No blogs available</h2>

          <p>
            There are no blog posts available at the moment. Check back later
            for new stories and updates.
          </p>

          {isAdmin && (
            <button
              className="empty-create-btn"
              onClick={() => navigate("/post-blog")}
            >
              <Plus size={18} />
              Create Your First Blog
            </button>
          )}
        </section>
      )}
    </main>
  );
};

export default Blogs;
