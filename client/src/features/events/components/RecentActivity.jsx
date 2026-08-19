const RecentActivity = ({ CheckCircle2 }) => {
  return (
    <section className="content-card">
      <div className="card-header">
        <h2>Recent Activity</h2>
      </div>
      <ul className="activity-list">
        <li className="activity-item">
          <CheckCircle2 size={18} className="activity-icon text-blue" />
          <div>
            <p className="activity-title">New feedback received</p>
            <span className="activity-time">10 minutes ago</span>
          </div>
        </li>
        <li className="activity-item">
          <CheckCircle2 size={18} className="activity-icon text-green" />
          <div>
            <p className="activity-title">5 new users registered</p>
            <span className="activity-time">1 hour ago</span>
          </div>
        </li>
        <li className="activity-item">
          <CheckCircle2 size={18} className="activity-icon text-orange" />
          <div>
            <p className="activity-title">
              "Design Workshop" status changed to Ongoing
            </p>
            <span className="activity-time">3 hours ago</span>
          </div>
        </li>
      </ul>
    </section>
  );
};

export default RecentActivity;
