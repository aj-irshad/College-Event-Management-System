import express from "express";

import { createBlog, getBlogs } from "../controller/blog.js";
import uploadImage from "../middleware/multerUpload.js";
import adminMiddleware from "../middleware/adminMiddleware.js";
const blogRouter = express.Router();

blogRouter.post(
  "/create-blog",
  uploadImage("blog-img"),
  adminMiddleware,
  createBlog,
);

blogRouter.get("/get-blog", getBlogs);

export default blogRouter;
