const RecentEvent = ({ recentEvents, ArrowUpRight }) => {
  return (
    <section className="content-card">
      <div className="card-header">
        <h2>Active & Upcoming Events</h2>
        <button className="text-btn">
          View All <ArrowUpRight size={16} />
        </button>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Event Name</th>
            <th>Date</th>
            <th>Attendees</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {recentEvents && recentEvents.length > 0 ? (
            recentEvents.map((evt) => (
              <tr key={evt.id}>
                <td className="font-semibold">{evt.name}</td>
                <td>{evt.date}</td>
                <td>{evt.attendees}</td>
                <td>
                  <span className={`status-badge ${evt.status.toLowerCase()}`}>
                    {evt.status}
                  </span>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4">No recent events</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
};

export default RecentEvent;
