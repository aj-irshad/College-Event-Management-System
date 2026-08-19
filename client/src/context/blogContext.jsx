import { createContext, useState, useEffect } from "react";
import { getBlogs } from "../services/blogService";

const blogContext = createContext({});

export const BlogProvider = ({ children }) => {
  const [blogs, setBlogs] = useState([]);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const response = await getBlogs();
        setBlogs(response.data.blogs);
      } catch (error) {
        console.error("Error fetching blogs:", error);
      }
    };

    fetchBlogs();
  }, []);

  return (
    <blogContext.Provider value={{ blogs, setBlogs }}>
      {children}
    </blogContext.Provider>
  );
};

export default blogContext;
