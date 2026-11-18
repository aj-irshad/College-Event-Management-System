import "../style/blogButton.css";

const BlogButton = ({ text, onClick, icon, style, variant = "primary", disabled = false }) => {
  return (
    <button
      className={`blog-btn blog-btn-${variant}`}
      onClick={onClick}
      type="button"
      style={style}
      disabled={disabled}
    >
      {icon && <span className="blog-btn-icon">{icon}</span>}

      <span>{text}</span>
    </button>
  );
};

export default BlogButton;
