import { deleteBlog } from "../../../services/blogService";

const handleDeleteBlogHook = async (blogId, setBlogs) => {
  try {
    await deleteBlog(blogId);
    setBlogs((prevBlogs) => prevBlogs.filter((blog) => blog._id !== blogId));
  } catch (err) {
    console.log(`Error: ${err.message}`);
  }
};

export default handleDeleteBlogHook;
