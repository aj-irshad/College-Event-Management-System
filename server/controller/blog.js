import fs from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import Blog from "../model/blogs.js";
import Users from "../model/user.js";
import { getIO } from "../socket.js";
import createNotification from "../utils/bellNotification.js";
import { getUploadDirectory } from "../utils/uploadPaths.js";
import {
  uploadToCloudinary,
  deleteFromCloudinary,
} from "../utils/cloudinary.js";

const BLOG_UPLOAD_DIR = getUploadDirectory("blogs");
const isValidId = (id) => /^[a-f\d]{24}$/i.test(id);

const removeTemporaryBlogImage = async (file) => {
  if (file?.path) {
    await fs.unlink(file.path).catch(() => {});
  }
};

const removeBlogImage = async (blogImage, publicId = "") => {
  if (publicId) {
    await deleteFromCloudinary(publicId);
    return;
  }

  // Backward compatibility with older local image records
  if (!blogImage || path.basename(blogImage) !== blogImage) return;

  const filePath = path.resolve(BLOG_UPLOAD_DIR, blogImage);

  if (!filePath.startsWith(`${BLOG_UPLOAD_DIR}${path.sep}`)) return;

  await fs.unlink(filePath).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
};

const removeImageIfUnused = async (blogImage, publicId = "") => {
  if (publicId) {
    const stillReferenced = await Blog.exists({
      $or: [{ blogImagePublicId: publicId }, { blogImage }],
    });

    if (!stillReferenced) {
      await removeBlogImage(blogImage, publicId);
    }

    return;
  }

  if (!blogImage) return;

  const stillReferenced = await Blog.exists({ blogImage });

  if (!stillReferenced) {
    await removeBlogImage(blogImage);
  }
};

const removeUploadedBlogImageIfUnreferenced = async (
  asset,
  writeDefinitelyDidNotCommit,
) => {
  if (!asset?.publicId) return;

  try {
    const referencedBlog = await Blog.exists({ blogImagePublicId: asset.publicId });
    if (referencedBlog) {
      console.warn("Retaining uploaded blog image referenced by a blog record");
      return;
    }
  } catch {
    console.error("Could not verify blog image references; retaining uploaded asset");
    return;
  }

  if (!writeDefinitelyDidNotCommit) {
    console.error("Blog write outcome is uncertain; retaining uploaded image asset");
    return;
  }

  try {
    await deleteFromCloudinary(asset.publicId);
  } catch {
    console.error("Could not clean up an unreferenced blog image asset");
  }
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
  let uploadedImage = null;
  let blogWriteAttempted = false;

  try {
    const { fields, error } = validateBlogFields(req.body || {});

    if (error) {
      return res.status(400).json({
        success: false,
        message: error,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Blog image is required",
      });
    }

    uploadedImage = await uploadToCloudinary(req.file.path, "blogs");

    const author = await Users.findById(req.userId).select("name");

    blogWriteAttempted = true;
    const blog = await Blog.create({
      ...fields,
      author: author?.name || "EMS Admin",
      blogImage: uploadedImage.url,
      blogImagePublicId: uploadedImage.publicId,
    });

    uploadedImage = null;

    emitBlogEvent("blogs:created", blog);

    createNotification(
      "New Blog Published!",
      `"${blog.title}" has been posted by the community.`,
      "blog",
      blog._id,
    ).catch((notificationError) =>
      console.error(
        "Background notification error:",
        notificationError.message,
      ),
    );

    return res.status(201).json({
      success: true,
      message: "Blog successfully created",
      blog,
    });
  } catch (error) {
    if (uploadedImage?.publicId) {
      const writeDefinitelyDidNotCommit =
        !blogWriteAttempted ||
        error.code === 11000 ||
        error.name === "ValidationError";
      await removeUploadedBlogImageIfUnreferenced(
        uploadedImage,
        writeDefinitelyDidNotCommit,
      );
    }

    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Error creating blog:", error.message);

    return res.status(500).json({
      success: false,
      message: "Error creating blog",
    });
  } finally {
    await removeTemporaryBlogImage(req.file);
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
      return res
        .status(404)
        .json({ success: false, message: "Blog not found" });
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
  let uploadedImage = null;
  let blog = null;
  let blogWriteAttempted = false;

  try {
    if (!isValidId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid blog ID",
      });
    }

    const { fields, error } = validateBlogFields(req.body || {}, {
      partial: true,
    });

    if (error) {
      return res.status(400).json({
        success: false,
        message: error,
      });
    }

    if (Object.keys(fields).length === 0 && !req.file) {
      return res.status(400).json({
        success: false,
        message: "No blog fields provided",
      });
    }

    blog = await Blog.findById(id);

    if (!blog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    const oldImage = blog.blogImage;
    const oldPublicId = blog.blogImagePublicId || "";

    if (req.file) {
      uploadedImage = await uploadToCloudinary(req.file.path, "blogs");
    }

    Object.assign(blog, fields);

    if (uploadedImage) {
      blog.blogImage = uploadedImage.url;
      blog.blogImagePublicId = uploadedImage.publicId;
    }

    blogWriteAttempted = true;
    const updatedBlog = await blog.save();

    // Database save succeeded; Cloudinary image is now referenced.
    uploadedImage = null;

    emitBlogEvent("blogs:updated", updatedBlog);

    if (req.file && oldImage) {
      await removeImageIfUnused(oldImage, oldPublicId).catch((cleanupError) =>
        console.error(
          "Failed to remove replaced blog image:",
          cleanupError.message,
        ),
      );
    }

    return res.status(200).json({
      success: true,
      message: "Blog updated successfully",
      blog: updatedBlog,
    });
  } catch (error) {
    if (uploadedImage?.publicId) {
      const writeDefinitelyDidNotCommit =
        !blogWriteAttempted ||
        error.code === 11000 ||
        error.name === "ValidationError";
      await removeUploadedBlogImageIfUnreferenced(
        uploadedImage,
        writeDefinitelyDidNotCommit,
      );
    }

    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Error updating blog:", error.message);

    return res.status(500).json({
      success: false,
      message: "Failed to update blog",
    });
  } finally {
    await removeTemporaryBlogImage(req.file);
  }
};

const deleteBlog = async (req, res) => {
  const { blogId } = req.body || {};

  if (!isValidId(blogId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid blog ID",
    });
  }

  try {
    const deletedBlog = await Blog.findByIdAndDelete(blogId);

    if (!deletedBlog) {
      return res.status(404).json({
        success: false,
        message: "Blog not found",
      });
    }

    emitBlogEvent("blogs:deleted", { _id: deletedBlog._id });

    if (deletedBlog.blogImage) {
      await removeImageIfUnused(
        deletedBlog.blogImage,
        deletedBlog.blogImagePublicId || "",
      ).catch((cleanupError) =>
        console.error(
          "Failed to remove unused blog image:",
          cleanupError.message,
        ),
      );
    }

    return res.status(200).json({
      success: true,
      message: "Blog deleted successfully",
      blog: deletedBlog,
    });
  } catch (error) {
    console.error("Error deleting blog:", error.message);

    return res.status(500).json({
      success: false,
      message: "Error deleting blog",
    });
  }
};

export { createBlog, getBlogs, getBlogById, updateBlog, deleteBlog };
