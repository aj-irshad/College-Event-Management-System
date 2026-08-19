import { Link } from "react-router-dom";

const BlogList = ({ blog }) => {
  return (
    <article className="blog">
      <Link
        to={`/blog/${blog._id}`}
        style={{
          display: "flex",
          gap: "50px",
          alignItems: "center",
        }}
      >
        <img
          src={`${import.meta.env.VITE_BASE_URL}/uploads/blog/${blog.blogImage}`}
          alt={blog.title}
          width="350"
          height="200"
        />

        <section className="blogDescription">
          <h1>{blog.title}</h1>
          <p className="postDate">{blog.createdAt}</p>
        </section>
      </Link>

      <p className="postBody">
        {blog.description.length <= 50
          ? blog.description
          : `${blog.description.slice(0, 50)}...`}
      </p>
    </article>
  );
};

export default BlogList;
