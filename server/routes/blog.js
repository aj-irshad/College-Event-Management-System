import express from "express";

import {
  createBlog,
  deleteBlog,
  getBlogs,
  getBlogById,
  updateBlog,
} from "../controller/blog.js";
import { uploadBlogImage } from "../middleware/multerUpload.js";
import authMiddleware from "../middleware/authMiddleware.js";
import adminMiddleware from "../middleware/adminMiddleware.js";
const blogRouter = express.Router();

blogRouter.post(
  "/create-blog",
  authMiddleware,
  adminMiddleware,
  uploadBlogImage,
  createBlog,
);

blogRouter.get("/get-blog", getBlogs);
blogRouter.get("/get-blog/:id", getBlogById);

blogRouter.delete("/delete-blog", authMiddleware, adminMiddleware, deleteBlog);

blogRouter.patch(
  "/update-blog/:id",
  authMiddleware,
  adminMiddleware,
  uploadBlogImage,
  updateBlog,
);

export default blogRouter;
