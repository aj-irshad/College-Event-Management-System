import { useEffect, useState, useContext } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import blogContext from "../../../context/blogContext";
import { updateBlog } from "../../../services/blogService";

const EditBlog = () => {
  const { blogs, setBlogs } = useContext(blogContext);

  const { id } = useParams();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [blogImage, setBlogImage] = useState(null);

  const [warning, setWarning] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Find blog from existing context
  useEffect(() => {
    const blog = blogs.find((blog) => blog._id.toString() === id);

    if (!blog) {
      setWarning("No blog found");
      setLoading(false);
      return;
    }

    setTitle(blog.title);
    setDescription(blog.description);

    setLoading(false);
  }, [id, blogs]);

  // Update blog
  const handleSubmit = async (e) => {
    e.preventDefault();

    setUpdating(true);

    try {
      const blogData = new FormData();

      blogData.append("title", title);
      blogData.append("description", description);

      if (blogImage) {
        blogData.append("blogImage", blogImage);
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

  // Loading
  if (loading) {
    return <h2>Loading...</h2>;
  }

  // Blog not found
  if (warning) {
    return (
      <main className="NewPost">
        <h2>{warning}</h2>

        <p>
          <Link to="/blogs">Back to Blogs</Link>
        </p>
      </main>
    );
  }

  // Edit form
  return (
    <main className="NewPost">
      <h2>Edit Blog</h2>

      <form className="newPostForm" onSubmit={handleSubmit}>
        <label htmlFor="blogTitle">Title:</label>

        <input
          autoFocus
          type="text"
          id="blogTitle"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <label htmlFor="blogDescription">Description:</label>

        <textarea
          id="blogDescription"
          required
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <label htmlFor="blogImage">Image:</label>

        <input
          type="file"
          id="blogImage"
          accept="image/*"
          onChange={(e) => setBlogImage(e.target.files[0])}
        />

        <button type="submit" disabled={updating}>
          {updating ? "Updating..." : "Update"}
        </button>
      </form>
    </main>
  );
};

export default EditBlog;
