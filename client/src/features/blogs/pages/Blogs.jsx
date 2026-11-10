import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Plus } from "lucide-react";

import { EmptyState, PageHeader } from "../../../components/ModulePageUI";
import blogContext from "../../../context/blogContext";
import authContext from "../../../context/authContext";
import BlogList from "../components/BlogList";

import "../style/blogs.css";

const Blogs = () => {
  const navigate = useNavigate();

  const { isAdmin } = useContext(authContext);
  const { blogs, blogLoading, blogError } = useContext(blogContext);

  return (
    <main className="blogs-page">
      <PageHeader
        title="Blog"
        description="Discover the latest stories, updates, and events from our college community."
        actionLabel={isAdmin ? "Create Blog" : undefined}
        actionIcon={isAdmin ? <Plus size={18} /> : undefined}
        onAction={isAdmin ? () => navigate("/post-blog") : undefined}
      />

      {blogError && <p className="blog-form-error" role="alert">{blogError}</p>}
      {blogLoading ? (
        <p role="status">Loading blog posts...</p>
      ) : blogs.length > 0 ? (
        <section className="blogs-grid">
          {blogs.map((blog) => (
            <BlogList blog={blog} key={blog._id} isAdmin={isAdmin} />
          ))}
        </section>
      ) : blogError ? null : (
        <EmptyState
          icon={FileText}
          title="No blogs yet"
          description="There are no blog posts available right now. Check back later for new stories and updates."
          actionLabel={isAdmin ? "Create Blog" : undefined}
          actionIcon={isAdmin ? <Plus size={18} /> : undefined}
          onAction={isAdmin ? () => navigate("/post-blog") : undefined}
        />
      )}
    </main>
  );
};

export default Blogs;
