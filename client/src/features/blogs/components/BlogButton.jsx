import "../style/blogButton.css";

const BlogButton = ({ text, onClick, icon, style, variant = "primary" }) => {
  return (
    <button
      className={`blog-btn blog-btn-${variant}`}
      onClick={onClick}
      type="button"
      style={style}
    >
      {icon && <span className="blog-btn-icon">{icon}</span>}

      <span>{text}</span>
    </button>
  );
};

export default BlogButton;
