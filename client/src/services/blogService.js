import apiRequest from "../api/apiRequest";

const createBlog = (blogData) => {
  return apiRequest.post("/blog/create-blog", blogData);
};

const getBlogs = () => {
  return apiRequest.get("/blog/get-blog");
};

const getBlogById = (id) => {
  return apiRequest.get(`/blog/get-blog/${id}`);
};

const updateBlog = (id, blogData) => {
  return apiRequest.patch(`/blog/update-blog/${id}`, blogData);
};

const deleteBlog = (blogId) => {
  return apiRequest.delete("/blog/delete-blog", {
    data: { blogId },
  });
};
export { createBlog, getBlogs, getBlogById, updateBlog, deleteBlog };
