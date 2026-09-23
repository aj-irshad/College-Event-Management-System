const EventBtn = ({
  text,
  onClick = null,
  icon,
  style = null,
  className = "primary-btn",
  disabled = false,
}) => {
  return (
    <button
      className={className}
      onClick={onClick}
      type="button"
      style={style}
      disabled={disabled}
    >
      {icon}
      {text}
    </button>
  );
};

export default EventBtn;
