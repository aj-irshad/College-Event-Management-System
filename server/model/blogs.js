import mongoose from "mongoose";

const BlogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      requires: true,
      trim: true,
    },
    description: {
      type: String,
      requires: true,
      trim: true,
    },
    blogImage: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

const Blog = mongoose.model("Blog", BlogSchema);

export default Blog;
