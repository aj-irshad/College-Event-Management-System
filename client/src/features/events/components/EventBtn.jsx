const EventBtn = ({ text, onClick = null, icon, style = null }) => {
  return (
    <button
      className="primary-btn"
      onClick={onClick}
      type="button"
      style={style}
    >
      {icon}
      {text}
    </button>
  );
};

export default EventBtn;
