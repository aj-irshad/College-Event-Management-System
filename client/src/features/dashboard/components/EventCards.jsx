const EventCards = ({ id, colorClass, count, label, Icon }) => {
  return (
    <article key={id} className={`stat-card ${colorClass}`}>
      <div className="icon-wrapper">
        <Icon size={22} />
      </div>
      <div className="stat-content">
        <span className="stat-count">{count}</span>
        <p className="stat-label">{label}</p>
      </div>
    </article>
  );
};

export default EventCards;
