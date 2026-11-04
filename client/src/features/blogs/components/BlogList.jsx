import { Link, useNavigate } from "react-router-dom";
import { Trash, Edit, CalendarDays } from "lucide-react";
import { useContext } from "react";

import BlogButton from "./BlogButton";
import { formatDate } from "../../../hooks/dateFormatter";
import { deleteBlog } from "../../../services/blogService";
import blogContext from "../../../context/blogContext";

import "../style/blogList.css";

const BlogList = ({ blog, isAdmin }) => {
  const { removeBlog } = useContext(blogContext);
  const navigate = useNavigate();

  const handleDeleteBlog = async (blogId) => {
    try {
      await deleteBlog(blogId);
      removeBlog(blogId);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete blog post.");
    }
  };

  return (
    <article className="blog-card">
      <Link to={`/blogs/${blog._id}`} className="blog-card-link">
        <div className="blog-image-wrapper">
          {blog.blogImage && (
            <img
              src={`${import.meta.env.VITE_BASE_URL}/uploads/blog/${blog.blogImage}`}
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
          />
        </div>
      )}
    </article>
  );
};

export default BlogList;
