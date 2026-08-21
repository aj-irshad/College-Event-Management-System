import express from "express";

import { createBlog, deleteBlog, getBlogs } from "../controller/blog.js";
import uploadImage from "../middleware/multerUpload.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";
const blogRouter = express.Router();

blogRouter.post(
  "/create-blog",
  authMiddleware,
  uploadImage("blog-img"),
  adminMiddleware,
  createBlog,
);

blogRouter.get("/get-blog", getBlogs);

blogRouter.delete("/delete-blog", authMiddleware, adminMiddleware, deleteBlog);

export default blogRouter;
