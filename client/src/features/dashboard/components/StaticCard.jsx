const StaticCard = ({ icon, count = [], cardName }) => {
  return (
    <article className="stat-card card-upcoming">
      <div className="icon-wrapper">{icon}</div>

      <div className="stat-content">
        <span className="stat-count">{count.length}</span>

        <p className="stat-label">{cardName}</p>
      </div>
    </article>
  );
};

export default StaticCard;
