import { Users, CalendarDays, Clock, MapPin, Trash, Edit } from "lucide-react";
import "../styles/eventcard.css";
import EventBtn from "../components/EventBtn";
import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import eventContext from "../../../context/EventContext";
import { formatDate, formatTime } from "../../../hooks/dateFormatter.js";

const EventCards = ({ event, isAdmin }) => {
  const navigate = useNavigate();
  const { deleteEventContext } = useContext(eventContext);

  const handleDeleteEvent = async (eventId) => {
    await deleteEventContext(eventId);
  };

  return (
    <article className="eventCard">
      {/* Main Event Information */}
      <section className="eventMain">
        <header className="eventHeader">
          <div className="eventType">
            <Users size={22} aria-hidden="true" />
            <span>{event.event_type}</span>
            {/* <span>Hello</span> */}
          </div>
        </header>

        <div className="eventContent">
          <h2 className="eventTitle">{event.title}</h2>

          <p className="eventDescription">{event.description}</p>

          <dl className="eventDetails">
            <div className="eventDetail">
              <dt>
                <CalendarDays size={20} aria-hidden="true" />
                <span>Date</span>
              </dt>

              <dd>
                <time dateTime={event.start_at}>
                  {formatDate(event.start_at)}
                </time>
              </dd>
            </div>

            <div className="eventDetail">
              <dt>
                <Clock size={20} aria-hidden="true" />
                <span>Time</span>
              </dt>

              <dd>
                <time dateTime={event.start_at}>
                  {formatTime(event.start_at)}
                </time>
                {" – "}
                <time dateTime={event.end_at}>{formatTime(event.end_at)}</time>
              </dd>
            </div>

            <div className="eventDetail">
              <dt>
                <MapPin size={20} aria-hidden="true" />
                <span>Venue</span>
              </dt>

              <dd>{event.venue}</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Bottom Section */}
      <footer className="eventFooter">
        <div className="eventStats">
          <div className="eventStat">
            <Users size={22} aria-hidden="true" />

            <div>
              <strong>Status</strong>
              <span>{event.status}</span>
            </div>
          </div>
          {isAdmin && (
            <EventBtn
              text={"Delete"}
              onClick={() => handleDeleteEvent(event._id)}
              icon={<Trash size={18} />}
              style={{ backgroundColor: "red" }}
            />
          )}

          {isAdmin && (
            <EventBtn
              text={"Edit"}
              icon={<Edit size={18} />}
              onClick={() => navigate(`/edit-event/${event._id}`)}
            />
          )}
        </div>
      </footer>
    </article>
  );
};

export default EventCards;
