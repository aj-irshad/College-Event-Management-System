import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { createBlog } from "../../../services/blogService";

import "../style/createBlog.css";

const PostBlog = () => {
  const navigate = useNavigate();
  const [postTitle, setPostTitle] = useState("");
  const [postDescription, setPostDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [blogImg, setBlogImg] = useState(null);

  const handleBlogSubmit = async (e) => {
    e.preventDefault();

    const blogData = new FormData();

    blogData.append("title", postTitle);
    blogData.append("description", postDescription);
    blogData.append("eventDate", eventDate);

    if (blogImg) {
      blogData.append("blog-img", blogImg);
    }

    try {
      const response = await createBlog(blogData);

      alert(response.data.message);

      // Optional: reset form after successful submission
      setPostTitle("");
      setPostDescription("");
      setEventDate("");
      setBlogImg(null);
      navigate("/blogs");
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="create-post-wrapper">
      <form onSubmit={handleBlogSubmit}>
        <section className="postBlog-form-grp">
          <label htmlFor="postTitle">Title:</label>

          <input
            autoFocus
            type="text"
            id="postTitle"
            name="postTitle"
            required
            value={postTitle}
            onChange={(e) => setPostTitle(e.target.value)}
          />
        </section>

        <section className="postBlog-form-grp">
          <label htmlFor="postDescription">Description:</label>

          <textarea
            id="postDescription"
            name="postDescription"
            required
            value={postDescription}
            onChange={(e) => setPostDescription(e.target.value)}
          />
        </section>

        <section className="postBlog-form-grp">
          <label htmlFor="eventDate">Event Date:</label>

          <input
            type="date"
            id="eventDate"
            name="eventDate"
            required
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
          />
        </section>

        <section className="postBlog-form-grp">
          <label htmlFor="blogImg">Image:</label>

          <input
            type="file"
            id="blogImg"
            name="blog-img"
            accept="image/*"
            onChange={(e) => setBlogImg(e.target.files[0])}
          />
        </section>

        <button type="submit">Submit</button>
      </form>
    </div>
  );
};

export default PostBlog;
