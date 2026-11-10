import fs from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import Blog from "../model/blogs.js";
import Users from "../model/user.js";
import { getIO } from "../socket.js";
import createNotification from "../utils/bellNotification.js";
import { getUploadDirectory } from "../utils/uploadPaths.js";

const BLOG_UPLOAD_DIR = getUploadDirectory("blogs");
const isValidId = (id) => /^[a-f\d]{24}$/i.test(id);

const removeBlogImageFile = async (filename) => {
  if (!filename || path.basename(filename) !== filename) return;
  const filePath = path.resolve(BLOG_UPLOAD_DIR, filename);
  if (!filePath.startsWith(`${BLOG_UPLOAD_DIR}${path.sep}`)) return;
  await fs.unlink(filePath).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
};

const removeImageIfUnused = async (filename) => {
  if (!filename) return;
  const stillReferenced = await Blog.exists({ blogImage: filename });
  if (!stillReferenced) await removeBlogImageFile(filename);
};

const emitBlogEvent = (eventName, payload) => {
  try {
    getIO().to("blogs").emit(eventName, payload);
  } catch (error) {
    console.error(`Failed to emit ${eventName}:`, error.message);
  }
};

const validateBlogFields = (body, { partial = false } = {}) => {
  const fields = {};
  for (const name of ["title", "description"]) {
    if (!partial || Object.hasOwn(body, name)) {
      if (typeof body[name] !== "string" || !body[name].trim()) {
        return { error: `${name} is required` };
      }
      fields[name] = body[name].trim();
    }
  }

  if (Object.hasOwn(body, "eventDate")) {
    if (body.eventDate === "" || body.eventDate === null) {
      fields.eventDate = null;
    } else {
      const date = new Date(body.eventDate);
      if (Number.isNaN(date.getTime())) {
        return { error: "Event date must be a valid date" };
      }
      fields.eventDate = date;
    }
  }

  return { fields };
};

const createBlog = async (req, res) => {
  const { fields, error } = validateBlogFields(req.body || {});
  if (error) {
    if (req.file) await removeBlogImageFile(req.file.filename).catch(() => {});
    return res.status(400).json({ success: false, message: error });
  }
  if (!req.file) {
    return res
      .status(400)
      .json({ success: false, message: "Blog image is required" });
  }

  try {
    const author = await Users.findById(req.userId).select("name");
    const blog = await Blog.create({
      ...fields,
      author: author?.name || "EMS Admin",
      blogImage: req.file.filename,
    });

    emitBlogEvent("blogs:created", blog);
    createNotification(
      "New Blog Published!",
      `"${blog.title}" has been posted by the community.`,
      "blog",
      blog._id,
    ).catch((notificationError) =>
      console.error("Background notification error:", notificationError.message),
    );

    return res.status(201).json({
      success: true,
      message: "Blog successfully created",
      blog,
    });
  } catch (error) {
    if (req.file) {
      await removeBlogImageFile(req.file.filename).catch((cleanupError) =>
        console.error("Failed to remove unused blog image:", cleanupError.message),
      );
    }
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error("Error creating blog:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Error creating blog" });
  }
};

const getBlogs = async (_req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1, _id: -1 });
    return res.status(200).json({
      success: true,
      message: "All blogs successfully fetched",
      blogs,
    });
  } catch (error) {
    console.error("Error fetching blogs:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch blogs" });
  }
};

const getBlogById = async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    return res.status(400).json({ success: false, message: "Invalid blog ID" });
  }

  try {
    const blog = await Blog.findById(id);
    if (!blog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }
    return res.status(200).json({ success: true, blog });
  } catch (error) {
    console.error("Error fetching blog:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch blog" });
  }
};

const updateBlog = async (req, res) => {
  const { id } = req.params;
  if (!isValidId(id)) {
    if (req.file) await removeBlogImageFile(req.file.filename).catch(() => {});
    return res.status(400).json({ success: false, message: "Invalid blog ID" });
  }

  const { fields, error } = validateBlogFields(req.body || {}, { partial: true });
  if (error) {
    if (req.file) await removeBlogImageFile(req.file.filename).catch(() => {});
    return res.status(400).json({ success: false, message: error });
  }
  if (Object.keys(fields).length === 0 && !req.file) {
    return res
      .status(400)
      .json({ success: false, message: "No blog fields provided" });
  }

  let oldImage;
  try {
    const blog = await Blog.findById(id);
    if (!blog) {
      if (req.file) await removeBlogImageFile(req.file.filename).catch(() => {});
      return res.status(404).json({ success: false, message: "Blog not found" });
    }

    oldImage = blog.blogImage;
    Object.assign(blog, fields);
    if (req.file) blog.blogImage = req.file.filename;
    const updatedBlog = await blog.save();

    emitBlogEvent("blogs:updated", updatedBlog);
    if (req.file && oldImage && oldImage !== req.file.filename) {
      await removeImageIfUnused(oldImage).catch((cleanupError) =>
        console.error("Failed to remove replaced blog image:", cleanupError.message),
      );
    }

    return res.status(200).json({
      success: true,
      message: "Blog updated successfully",
      blog: updatedBlog,
    });
  } catch (error) {
    if (req.file) {
      await removeBlogImageFile(req.file.filename).catch((cleanupError) =>
        console.error("Failed to remove unused blog image:", cleanupError.message),
      );
    }
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ success: false, message: error.message });
    }
    console.error("Error updating blog:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update blog" });
  }
};

const deleteBlog = async (req, res) => {
  const { blogId } = req.body || {};
  if (!isValidId(blogId)) {
    return res.status(400).json({ success: false, message: "Invalid blog ID" });
  }

  try {
    const deletedBlog = await Blog.findByIdAndDelete(blogId);
    if (!deletedBlog) {
      return res.status(404).json({ success: false, message: "Blog not found" });
    }

    emitBlogEvent("blogs:deleted", { _id: deletedBlog._id });
    if (deletedBlog.blogImage) {
      await removeImageIfUnused(deletedBlog.blogImage).catch((cleanupError) =>
        console.error("Failed to remove unused blog image:", cleanupError.message),
      );
    }

    return res.status(200).json({
      success: true,
      message: "Blog deleted successfully",
      blog: deletedBlog,
    });
  } catch (error) {
    console.error("Error deleting blog:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Error deleting blog" });
  }
};

export { createBlog, getBlogs, getBlogById, updateBlog, deleteBlog };
