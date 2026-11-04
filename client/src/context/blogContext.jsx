import { createContext, useCallback, useEffect, useRef, useState } from "react";
import { getBlogs } from "../services/blogService";
import socket from "../api/socket";

const blogContext = createContext({});

const sortBlogs = (blogs) =>
  [...blogs].sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
  );

export const BlogProvider = ({ children }) => {
  const [blogs, setBlogs] = useState([]);
  const [blogLoading, setBlogLoading] = useState(true);
  const [blogError, setBlogError] = useState("");
  const initialLoadRef = useRef(null);
  const hasConnectedRef = useRef(false);
  const revisionRef = useRef(0);

  const upsertBlog = useCallback((blog) => {
    if (!blog?._id) return;
    revisionRef.current += 1;
    setBlogs((previous) =>
      sortBlogs([blog, ...previous.filter((item) => item._id !== blog._id)]),
    );
  }, []);

  const removeBlog = useCallback((blogId) => {
    if (!blogId) return;
    revisionRef.current += 1;
    setBlogs((previous) => previous.filter((blog) => blog._id !== blogId));
  }, []);

  useEffect(() => {
    const loadInitialBlogs = async () => {
      const revisionAtRequest = revisionRef.current;
      try {
        const response = await getBlogs();
        const fetchedBlogs = response.data?.blogs;
        if (!Array.isArray(fetchedBlogs)) {
          throw new Error("Unexpected blog response");
        }
        if (revisionRef.current === revisionAtRequest) {
          setBlogs(sortBlogs(fetchedBlogs));
          setBlogError("");
        }
      } catch (error) {
        console.error("Error fetching blogs:", error.message);
        setBlogError("Failed to load blog posts. Please try again later.");
      } finally {
        setBlogLoading(false);
      }
    };

    initialLoadRef.current = loadInitialBlogs();
  }, []);

  useEffect(() => {
    const refreshBlogs = async () => {
      const revisionAtRequest = revisionRef.current;
      try {
        const response = await getBlogs();
        const fetchedBlogs = response.data?.blogs;
        if (!Array.isArray(fetchedBlogs)) {
          throw new Error("Unexpected blog response");
        }
        if (revisionRef.current === revisionAtRequest) {
          setBlogs(sortBlogs(fetchedBlogs));
          setBlogError("");
        }
      } catch (error) {
        console.error("Failed to synchronize blog posts:", error.message);
        setBlogError("Failed to refresh blog posts.");
      }
    };

    const handleReady = () => {
      if (hasConnectedRef.current) {
        void refreshBlogs();
        return;
      }
      hasConnectedRef.current = true;
      void (initialLoadRef.current || Promise.resolve()).then(
        refreshBlogs,
        refreshBlogs,
      );
    };

    const handleCreated = (blog) => upsertBlog(blog);
    const handleUpdated = (blog) => upsertBlog(blog);
    const handleDeleted = ({ _id }) => removeBlog(_id);

    socket.on("blogs:ready", handleReady);
    socket.on("blogs:created", handleCreated);
    socket.on("blogs:updated", handleUpdated);
    socket.on("blogs:deleted", handleDeleted);

    if (socket.connected) handleReady();

    return () => {
      socket.off("blogs:ready", handleReady);
      socket.off("blogs:created", handleCreated);
      socket.off("blogs:updated", handleUpdated);
      socket.off("blogs:deleted", handleDeleted);
    };
  }, [removeBlog, upsertBlog]);

  return (
    <blogContext.Provider
      value={{
        blogs,
        setBlogs,
        upsertBlog,
        removeBlog,
        totalBlogs: blogs.length,
        blogLoading,
        blogError,
      }}
    >
      {children}
    </blogContext.Provider>
  );
};

export default blogContext;
