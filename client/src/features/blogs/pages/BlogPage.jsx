import { useContext, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays } from "lucide-react";

import blogContext from "../../../context/blogContext";
import socket from "../../../api/socket";
import { getBlogById } from "../../../services/blogService";
import { formatDate } from "../../../hooks/dateFormatter";

import "../style/blogPage.css";

const BlogPage = () => {
  const { id } = useParams();
  const { blogs, blogLoading } = useContext(blogContext);
  const [fetchedBlog, setFetchedBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setNotFound(false);
    setDeleted(false);
    getBlogById(id).then(({ data }) => {
      if (active) setFetchedBlog(data.blog);
    }).catch(() => {
      if (active) setNotFound(true);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    const handleDeleted = (payload) => {
      if (payload?._id === id) setDeleted(true);
    };
    socket.on("blogs:deleted", handleDeleted);
    return () => socket.off("blogs:deleted", handleDeleted);
  }, [id]);

  const blog = deleted ? null : blogs.find((item) => item._id === id) || fetchedBlog;
  if (loading || (blogLoading && !blog)) return <main className="blog-page"><p role="status">Loading blog...</p></main>;
  if (notFound && !blog) return <main className="blog-page"><section className="blog-not-found"><h2>Blog not found</h2><p>This post may have been removed.</p><Link to="/blogs" className="back-to-blogs"><ArrowLeft size={17} />Back to Blogs</Link></section></main>;
  if (!blog) return <main className="blog-page"><section className="blog-not-found"><h2>Blog not found</h2><p>This post may have been removed.</p><Link to="/blogs" className="back-to-blogs"><ArrowLeft size={17} />Back to Blogs</Link></section></main>;

  return (
    <main className="blog-page">
      <Link to="/blogs" className="back-to-blogs"><ArrowLeft size={17} />Back to Blogs</Link>
      <header className="blog-page-header">
        <div className="blog-page-meta">
          <span className="blog-page-date"><CalendarDays size={16} />Published {formatDate(blog.createdAt || blog.eventDate)}</span>
          <span className="blog-page-author">By {blog.author || "EMS Admin"}</span>
        </div>
        <h1>{blog.title}</h1>
        {blog.eventDate && <p className="blog-page-event-date">Event date: {formatDate(blog.eventDate)}</p>}
      </header>
      {blog.blogImage && <div className="blog-page-image-wrapper"><img src={`${import.meta.env.VITE_BASE_URL}/uploads/blog/${blog.blogImage}`} alt={blog.title} className="blog-page-image" /></div>}
      <article className="blog-page-content"><p>{blog.description}</p></article>
    </main>
  );
};

export default BlogPage;
