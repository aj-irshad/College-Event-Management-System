import { formatDate, formatTime } from "../../../hooks/dateFormatter";
import { Clock, MapPin } from "lucide-react";
const EventTable = ({ events }) => {
  return (
    <table className="data-table">
      <thead>
        <tr>
          <th>Event Name</th>
          <th>Date & Time</th>
          <th>Location</th>
          <th>RSVP Status</th>
        </tr>
      </thead>

      <tbody>
        {events.splice(0, 3).map((event) => (
          <tr key={event._id}>
            <td className="font-semibold">{event.title}</td>

            <td>
              <div className="table-time-cell">
                <span>{formatDate(event.start_at)}</span>

                <span className="sub-time">
                  <Clock size={12} />
                  {formatTime(event.start_at)}
                </span>
              </div>
            </td>

            <td>
              <div className="table-location-cell">
                <MapPin size={14} className="text-muted" />

                {event.venue}
              </div>
            </td>

            <td>
              <span className={`status-badge ${event.status.toLowerCase()}`}>
                {event.status}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default EventTable;
