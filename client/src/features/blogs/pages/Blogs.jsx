// import {  } from "lucide-react";
import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import blogContext from "../../../context/blogContext";
import authContext from "../../../context/authContext";
import BlogList from "../components/BlogList";

const Blogs = () => {
  const navigate = useNavigate();
  // return <button onClick={() => navigate("/post-blog")}>Create Blog</button>;
  const { isAdmin } = useContext(authContext);
  const { blogs } = useContext(blogContext);
  return (
    <>
      <h1>Blog</h1>

      {isAdmin && (
        <button onClick={() => navigate("/post-blog")}>Create Blog</button>
      )}

      {blogs.length ? (
        <section>
          {blogs.map((blog) => (
            <BlogList blog={blog} key={blog._id} />
          ))}
        </section>
      ) : (
        <p className="noBlog">No blog available</p>
      )}
    </>
  );
};

export default Blogs;
