import Blog from "../model/blogs.js";

const createBlog = async (req, res) => {
  try {
    const { title, description, eventDate } = req.body;

    if (!req.file) {
      return res.status(400).json({
        message: "Blog image is required",
      });
    }

    const blog = await Blog.create({
      title,
      description,
      eventDate,
      blogImage: req.file.filename,
    });

    return res.status(201).json({
      message: "Blog successfully created",
      blog,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Error creating blog",
    });
  }
};

const getBlogs = async (req, res) => {
  try {
    const blogs = await Blog.find();

    res.json({
      message: "All blogs successfully fetched",
      blogs,
    });
  } catch (err) {
    res.json({
      message: "error fetching blogs",
    });
  }
};

const deleteBlog = async (req, res) => {
  try {
    const { blogId } = req.body;

    if (!blogId) {
      return res.status(400).json({
        message: "Blog ID is required",
      });
    }

    const deletedBlog = await Blog.findByIdAndDelete(blogId);

    if (!deletedBlog) {
      return res.status(404).json({
        message: "Blog not found",
      });
    }

    res.status(200).json({
      message: "Blog deleted successfully",
      blog: deletedBlog,
    });
  } catch (err) {
    return res.status(500).json({
      message: "Error deleting blog",
    });
  }
};
export { createBlog, getBlogs, deleteBlog };
