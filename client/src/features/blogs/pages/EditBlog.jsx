import { useEffect, useState, useContext } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CalendarDays, Image, Save, ArrowLeft } from "lucide-react";

import blogContext from "../../../context/blogContext";
import { getBlogById, updateBlog } from "../../../services/blogService";
import { resolveImageUrl } from "../../../utils/imageUrl";

import "../style/editBlog.css";

const EditBlog = () => {
  const { upsertBlog } = useContext(blogContext);
  const { id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [blogImage, setBlogImage] = useState(null);
  const [currentImage, setCurrentImage] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setWarning("");
    getBlogById(id).then(({ data }) => {
      if (!active) return;
      const blog = data.blog;
      setTitle(blog.title || "");
      setDescription(blog.description || "");
      setEventDate(blog.eventDate ? new Date(blog.eventDate).toISOString().slice(0, 10) : "");
      setCurrentImage(blog.blogImage || "");
      setLoading(false);
    }).catch((requestError) => {
      if (!active) return;
      setWarning(requestError.response?.status === 404 ? "Blog not found" : "Unable to load blog");
      setLoading(false);
    });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    if (!blogImage) {
      setPreviewUrl("");
      return undefined;
    }
    const objectUrl = URL.createObjectURL(blogImage);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blogImage]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setError("");
    try {
      const blogData = new FormData();
      blogData.append("title", title);
      blogData.append("description", description);
      blogData.append("eventDate", eventDate);
      if (blogImage) blogData.append("blog-img", blogImage);
      const response = await updateBlog(id, blogData);
      upsertBlog(response.data.blog);
      navigate("/blogs");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Failed to update blog.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <main className="edit-blog-page"><div className="edit-blog-loading"><p>Loading blog...</p></div></main>;
  if (warning) return <main className="edit-blog-page"><section className="blog-not-found"><h2>{warning}</h2><p>The blog you're trying to edit could not be loaded.</p><Link to="/blogs" className="back-to-blogs"><ArrowLeft size={17} />Back to Blogs</Link></section></main>;

  return (
    <main className="edit-blog-page">
      <header className="edit-blog-header">
        <div><p className="edit-blog-eyebrow">Blog Management</p><h1>Edit Blog</h1><p>Update your blog post information and keep it up to date.</p></div>
        <Link to="/blogs" className="back-to-blogs"><ArrowLeft size={17} />Back to Blogs</Link>
      </header>
      <form className="edit-blog-form" onSubmit={handleSubmit}>
        <section className="edit-form-group"><label htmlFor="blogTitle">Title</label><input autoFocus type="text" id="blogTitle" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter blog title" /></section>
        <section className="edit-form-group"><label htmlFor="blogDescription">Description</label><textarea id="blogDescription" required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Write your blog description..." /></section>
        <section className="edit-form-group"><label htmlFor="eventDate"><CalendarDays size={16} />Event Date</label><input type="date" id="eventDate" value={eventDate} onChange={(e) => setEventDate(e.target.value)} /><small>Select the date associated with this blog post.</small></section>
        <section className="edit-form-group"><label htmlFor="blogImage"><Image size={16} />Change Image</label><input type="file" id="blogImage" accept=".jpg,.jpeg,.png,.webp,.gif,.avif,image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={(e) => setBlogImage(e.target.files?.[0] || null)} /><small>Leave empty if you want to keep the current image.</small></section>
        {(previewUrl || currentImage) && <img className="blog-form-image-preview" src={previewUrl || resolveImageUrl(currentImage, "blogs")} alt="Blog cover preview" />}
        {error && <p className="blog-form-error" role="alert">{error}</p>}
        <div className="edit-blog-actions"><Link to="/blogs" className="cancel-blog-btn">Cancel</Link><button type="submit" className="update-blog-btn" disabled={updating}><Save size={18} />{updating ? "Updating..." : "Update Blog"}</button></div>
      </form>
    </main>
  );
};

export default EditBlog;
