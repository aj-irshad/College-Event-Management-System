import { useEffect, useState, useContext } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CalendarDays, Image, Save, ArrowLeft } from "lucide-react";

import blogContext from "../../../context/blogContext";
import { updateBlog } from "../../../services/blogService";

import "../style/editBlog.css";

const EditBlog = () => {
  const { blogs, setBlogs } = useContext(blogContext);

  const { id } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [blogImage, setBlogImage] = useState(null);

  const [warning, setWarning] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const blog = blogs.find((blog) => blog._id.toString() === id);

    if (!blog) {
      setWarning("No blog found");
      setLoading(false);
      return;
    }

    setTitle(blog.title);
    setDescription(blog.description);

    // Convert stored date to YYYY-MM-DD for input[type="date"]
    if (blog.eventDate) {
      setEventDate(new Date(blog.eventDate).toISOString().split("T")[0]);
    }

    setLoading(false);
  }, [id, blogs]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setUpdating(true);

    try {
      const blogData = new FormData();

      blogData.append("title", title);
      blogData.append("description", description);
      blogData.append("eventDate", eventDate);

      if (blogImage) {
        blogData.append("blog-img", blogImage);
      }

      const response = await updateBlog(id, blogData);

      setBlogs((prevBlogs) =>
        prevBlogs.map((blog) =>
          blog._id.toString() === id ? response.data.blog : blog,
        ),
      );

      navigate("/blogs");
    } catch (error) {
      console.error("Error updating blog:", error);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <main className="edit-blog-page">
        <div className="edit-blog-loading">
          <p>Loading blog...</p>
        </div>
      </main>
    );
  }

  if (warning) {
    return (
      <main className="edit-blog-page">
        <section className="blog-not-found">
          <h2>{warning}</h2>

          <p>The blog you're trying to edit could not be found.</p>

          <Link to="/blogs" className="back-to-blogs">
            <ArrowLeft size={17} />
            Back to Blogs
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="edit-blog-page">
      <header className="edit-blog-header">
        <div>
          <p className="edit-blog-eyebrow">Blog Management</p>

          <h1>Edit Blog</h1>

          <p>Update your blog post information and keep it up to date.</p>
        </div>

        <Link to="/blogs" className="back-to-blogs">
          <ArrowLeft size={17} />
          Back to Blogs
        </Link>
      </header>

      <form className="edit-blog-form" onSubmit={handleSubmit}>
        {/* Title */}
        <section className="edit-form-group">
          <label htmlFor="blogTitle">Title</label>

          <input
            autoFocus
            type="text"
            id="blogTitle"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter blog title"
          />
        </section>

        {/* Description */}
        <section className="edit-form-group">
          <label htmlFor="blogDescription">Description</label>

          <textarea
            id="blogDescription"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Write your blog description..."
          />
        </section>

        {/* Event Date */}
        <section className="edit-form-group">
          <label htmlFor="eventDate">
            <CalendarDays size={16} />
            Event Date
          </label>

          <input
            type="date"
            id="eventDate"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />

          <small>Select the date associated with this blog post.</small>
        </section>

        {/* Image */}
        <section className="edit-form-group">
          <label htmlFor="blogImage">
            <Image size={16} />
            Change Image
          </label>

          <input
            type="file"
            id="blogImage"
            accept="image/*"
            onChange={(e) => setBlogImage(e.target.files[0])}
          />

          <small>Leave empty if you want to keep the current image.</small>
        </section>

        {/* Actions */}
        <div className="edit-blog-actions">
          <Link to="/blogs" className="cancel-blog-btn">
            Cancel
          </Link>

          <button type="submit" className="update-blog-btn" disabled={updating}>
            <Save size={18} />

            {updating ? "Updating..." : "Update Blog"}
          </button>
        </div>
      </form>
    </main>
  );
};

export default EditBlog;
