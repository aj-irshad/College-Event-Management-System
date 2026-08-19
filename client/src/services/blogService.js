import apiRequest from "../api/apiRequest";

const createBlog = (blogData) => {
  return apiRequest.post("/blog/create-blog", blogData);
};

const getBlogs = () => {
  return apiRequest.get("/blog/get-blog");
};

const updateBlog = (id, blogData) => {
  return apiRequest.patch(`/blog/update-blog/${id}`, blogData);
};
export { createBlog, getBlogs, updateBlog };
