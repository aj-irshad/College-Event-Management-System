import { Link, useParams } from "react-router-dom";
import { CalendarDays, ArrowLeft } from "lucide-react";
import { useContext } from "react";

import blogContext from "../../../context/blogContext";
import { formatDate } from "../../../hooks/dateFormatter";

import "../style/blogPage.css";

const BlogPage = () => {
  const { id } = useParams();
  const { blogs } = useContext(blogContext);

  const blog = blogs.find((blog) => blog._id.toString() === id);

  // Blog not found
  if (!blog) {
    return (
      <main className="blog-page">
        <section className="blog-not-found">
          <h2>Blog not found</h2>

          <p>
            The blog you are looking for doesn't exist or is no longer
            available.
          </p>

          <Link to="/blogs" className="back-to-blogs">
            <ArrowLeft size={17} />
            Back to Blogs
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="blog-page">
      {/* Back button */}
      <Link to="/blogs" className="back-to-blogs">
        <ArrowLeft size={17} />
        Back to Blogs
      </Link>

      {/* Blog Header */}
      <header
        className="blog-page-header"
        style={{ display: "flex", justifyContent: "space-between" }}
      >
        <div className="blog-page-date">
          <CalendarDays size={17} />

          <span>{formatDate(blog.eventDate)}</span>
        </div>

        <h1>{blog.title}</h1>
      </header>

      {/* Blog Image */}
      <section className="blog-page-image-wrapper">
        <img
          src={`${import.meta.env.VITE_BASE_URL}/uploads/blog/${blog.blogImage}`}
          alt={blog.title}
          className="blog-page-image"
        />
      </section>

      {/* Blog Content */}
      <article className="blog-page-content">
        <p>{blog.description}</p>
      </article>
    </main>
  );
};

export default BlogPage;
