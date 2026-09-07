const StaticCard = ({ icon, count = 0, cardName }) => {
  return (
    <article className="stat-card card-upcoming">
      <div className="icon-wrapper">{icon}</div>

      <div className="stat-content">
        <span className="stat-count">{count}</span>
        <p className="stat-label">{cardName}</p>
      </div>
    </article>
  );
};

export default StaticCard;
