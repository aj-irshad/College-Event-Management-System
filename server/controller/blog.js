import Blog from "../model/blogs.js";

const createBlog = async (req, res) => {
  try {
    const { title, description, eventDate } = req.body;
    const blogImage = req.file.filename;

    if (!req.file) {
      return res.status(400).json({
        message: "Blog image is required",
      });
    }

    const blog = await Blog.create({
      title,
      description,
      eventDate,
      blogImage: req.file?.filename,
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
export { createBlog, getBlogs };
