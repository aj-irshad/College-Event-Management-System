const PollBtn = ({
  text,
  onClick = null,
  icon,
  style = null,
  className = "primary-btn",
  type = "button",
  disabled = false,
}) => {
  return (
    <button
      className={className}
      onClick={onClick}
      type={type}
      style={style}
      disabled={disabled}
    >
      {icon}
      {text}
    </button>
  );
};

export default PollBtn;
