import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { createBlog } from "../../../services/blogService";
import blogContext from "../../../context/blogContext";

import "../style/createBlog.css";

const PostBlog = () => {
  const navigate = useNavigate();
  const [postTitle, setPostTitle] = useState("");
  const [postDescription, setPostDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [blogImg, setBlogImg] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { upsertBlog } = useContext(blogContext);

  useEffect(() => {
    if (!blogImg) {
      setPreviewUrl("");
      return undefined;
    }
    const objectUrl = URL.createObjectURL(blogImg);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [blogImg]);

  const handleBlogSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const blogData = new FormData();
    blogData.append("title", postTitle);
    blogData.append("description", postDescription);
    blogData.append("eventDate", eventDate);
    if (blogImg) blogData.append("blog-img", blogImg);

    try {
      const response = await createBlog(blogData);
      upsertBlog(response.data.blog);
      navigate("/blogs");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Failed to publish blog post.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="create-post-wrapper">
      <form onSubmit={handleBlogSubmit}>
        <section className="postBlog-form-grp">
          <label htmlFor="postTitle">Title:</label>
          <input autoFocus type="text" id="postTitle" required value={postTitle} onChange={(e) => setPostTitle(e.target.value)} />
        </section>
        <section className="postBlog-form-grp">
          <label htmlFor="postDescription">Description:</label>
          <textarea id="postDescription" required value={postDescription} onChange={(e) => setPostDescription(e.target.value)} />
        </section>
        <section className="postBlog-form-grp">
          <label htmlFor="eventDate">Event Date:</label>
          <input type="date" id="eventDate" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
        </section>
        <section className="postBlog-form-grp">
          <label htmlFor="blogImg">Image:</label>
          <input type="file" id="blogImg" name="blog-img" accept=".jpg,.jpeg,.png,.webp,.gif,.avif,image/jpeg,image/png,image/webp,image/gif,image/avif" required onChange={(e) => setBlogImg(e.target.files?.[0] || null)} />
        </section>
        {previewUrl && <img className="blog-form-image-preview" src={previewUrl} alt="Selected blog cover preview" />}
        {error && <p className="blog-form-error" role="alert">{error}</p>}
        <button type="submit" disabled={submitting}>{submitting ? "Publishing..." : "Submit"}</button>
      </form>
    </div>
  );
};

export default PostBlog;
