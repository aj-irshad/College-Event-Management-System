import { Link, useNavigate } from "react-router-dom";
import { Trash, Edit, CalendarDays } from "lucide-react";
import { useContext, useState } from "react";

import BlogButton from "./BlogButton";
import { formatDate } from "../../../hooks/dateFormatter";
import { deleteBlog } from "../../../services/blogService";
import blogContext from "../../../context/blogContext";
import { resolveImageUrl } from "../../../utils/imageUrl";
import { useNotifications } from "../../../context/NotificationContext.jsx";

import "../style/blogList.css";

const BlogList = ({ blog, isAdmin }) => {
  const { removeBlog } = useContext(blogContext);
  const navigate = useNavigate();
  const { notify, confirm } = useNotifications();
  const [deleting, setDeleting] = useState(false);

  const handleDeleteBlog = async (blogId) => {
    if (deleting) return;
    const accepted = await confirm({
      title: "Delete blog post?",
      message: "This will permanently delete the blog post and its associated image.",
      confirmText: "Delete blog",
      destructive: true,
    });
    if (!accepted) return;
    setDeleting(true);
    try {
      await deleteBlog(blogId);
      removeBlog(blogId);
      notify("success", "The blog post was deleted.");
    } catch (err) {
      notify("error", err.response?.data?.message || "Failed to delete blog post.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <article className="blog-card">
      <Link to={`/blogs/${blog._id}`} className="blog-card-link">
        <div className="blog-image-wrapper">
          {blog.blogImage && (
            <img
              src={resolveImageUrl(blog.blogImage, "blogs")}
              alt={blog.title}
              className="blog-image"
            />
          )}
        </div>

        <div className="blog-card-content">
          <div className="blog-date">
            <CalendarDays size={15} />

            <span>Published {formatDate(blog.createdAt || blog.eventDate)}</span>
          </div>

          <h2 className="blog-title">{blog.title}</h2>
          <p className="blog-author">By {blog.author || "EMS Admin"}</p>

          <p className="blog-description">
            {blog.description.length <= 100
              ? blog.description
              : `${blog.description.slice(0, 100)}...`}
          </p>

          <span className="read-blog">Read more →</span>
        </div>
      </Link>

      {/* Edit and Delete Buttons */}
      {isAdmin && (
        <div className="blog-actions">
          <BlogButton
            text="Edit"
            icon={<Edit size={18} />}
            onClick={() => navigate(`/edit-blog/${blog._id}`)}
          />

          <BlogButton
            text="Delete"
            onClick={() => handleDeleteBlog(blog._id)}
            icon={<Trash size={18} />}
            variant="danger"
            disabled={deleting}
          />
        </div>
      )}
    </article>
  );
};

export default BlogList;
