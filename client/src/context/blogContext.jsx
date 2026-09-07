import { createContext, useState, useEffect } from "react";
import { getBlogs } from "../services/blogService";

const blogContext = createContext({});

export const BlogProvider = ({ children }) => {
  const [blogs, setBlogs] = useState([]);
  const [totalBlogs, setTotalBlogs] = useState(0);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const response = await getBlogs();
        setBlogs(response.data.blogs);
        setTotalBlogs(response.data.blogs.length);
      } catch (error) {
        console.error("Error fetching blogs:", error);
      }
    };

    fetchBlogs();
  }, []);

  return (
    <blogContext.Provider value={{ blogs, setBlogs, totalBlogs }}>
      {children}
    </blogContext.Provider>
  );
};

export default blogContext;
