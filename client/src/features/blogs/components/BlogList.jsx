import { Link, useNavigate } from "react-router-dom";
import { Trash, Edit, CalendarDays } from "lucide-react";
import { useContext } from "react";

import BlogButton from "./BlogButton";
import { formatDate } from "../../../hooks/dateFormatter";
import { deleteBlog } from "../../../services/blogService";
import blogContext from "../../../context/blogContext";

import "../style/blogList.css";

const BlogList = ({ blog, isAdmin }) => {
  const { setBlogs } = useContext(blogContext);
  const navigate = useNavigate();

  const handleDeleteBlog = async (blogId) => {
    try {
      await deleteBlog(blogId);
      setBlogs((prevBlogs) => prevBlogs.filter((blog) => blog._id !== blogId));
    } catch (err) {
      console.log(`Error: ${err.message}`);
    }
  };

  return (
    <article className="blog-card">
      <Link to={`/blogs/${blog._id}`} className="blog-card-link">
        <div className="blog-image-wrapper">
          <img
            src={`${import.meta.env.VITE_BASE_URL}/uploads/blog/${blog.blogImage}`}
            alt={blog.title}
            className="blog-image"
          />
        </div>

        <div className="blog-card-content">
          <div className="blog-date">
            <CalendarDays size={15} />

            <span>{formatDate(blog.eventDate)}</span>
          </div>

          <h2 className="blog-title">{blog.title}</h2>

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
