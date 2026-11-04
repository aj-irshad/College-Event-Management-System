import mongoose from "mongoose";

const BlogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: String,
      trim: true,
      default: "EMS Admin",
    },
    eventDate: {
      type: Date,
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
