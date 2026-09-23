import {
  Users,
  CalendarDays,
  Clock,
  MapPin,
  Trash,
  Edit,
  MessageSquarePlus,
  UserPlus,
} from "lucide-react";

import { useContext } from "react";
import { useNavigate } from "react-router-dom";

import EventBtn from "../components/EventBtn";
import eventContext from "../../../context/EventContext";
import { formatDate, formatTime } from "../../../hooks/dateFormatter.js";

import "../styles/eventcard.css";

const EventCards = ({ event, isAdmin, hasParticipated }) => {
  const navigate = useNavigate();

  const { deleteEventContext } = useContext(eventContext);

  const handleDeleteEvent = async (eventId) => {
    await deleteEventContext(eventId);
  };

  return (
    <article className="eventCard">
      <section className="eventMain">
        <header className="eventHeader">
          <div className="eventType">
            <Users size={18} aria-hidden="true" />
            <span>{event.event_type}</span>
          </div>
        </header>

        <div className="eventContent">
          <h2 className="eventTitle">{event.title}</h2>

          <p className="eventDescription">{event.description}</p>

          <dl className="eventDetails">
            {/* Date */}
            <div className="eventDetail eventDate">
              <dt>
                <span className="eventDetailIcon">
                  <CalendarDays size={18} aria-hidden="true" />
                </span>

                <span className="eventDetailLabel">Date</span>
              </dt>

              <dd>
                <time dateTime={event.start_at}>
                  {formatDate(event.start_at)}
                </time>
              </dd>
            </div>

            {/* Time */}
            <div className="eventDetail eventTime">
              <dt>
                <span className="eventDetailIcon">
                  <Clock size={18} aria-hidden="true" />
                </span>

                <span className="eventDetailLabel">Time</span>
              </dt>

              <dd>
                <time dateTime={event.start_at}>
                  {formatTime(event.start_at)}
                </time>

                {" – "}

                <time dateTime={event.end_at}>{formatTime(event.end_at)}</time>
              </dd>
            </div>

            {/* Venue */}
            <div className="eventDetail eventVenue">
              <dt>
                <span className="eventDetailIcon">
                  <MapPin size={18} aria-hidden="true" />
                </span>

                <span className="eventDetailLabel">Venue</span>
              </dt>

              <dd>{event.venue}</dd>
            </div>
          </dl>
        </div>
      </section>

      <footer className="eventFooter">
        <div className="eventStats">
          {/* Event Status */}
          <div className="eventStatus">
            <span className="eventStatusIcon">
              <Users size={18} aria-hidden="true" />
            </span>

            <div className="eventStatusText">
              <strong>Status</strong>
              <span>{event.status}</span>
            </div>
          </div>

          {/* User Participation Button */}
          {!isAdmin && event.status === "Upcoming" && (
            <EventBtn
              text={hasParticipated ? "Participated" : "Participate"}
              icon={<UserPlus size={16} />}
              onClick={
                hasParticipated
                  ? null
                  : () => navigate(`/participate/${event._id}`)
              }
              disabled={hasParticipated}
              className={
                hasParticipated ? "eventBtnDisabled" : "eventBtnPrimary"
              }
            />
          )}

          {/* Admin Actions */}
          {isAdmin && (
            <div className="eventActions">
              <EventBtn
                text="Edit"
                icon={<Edit size={16} />}
                className="eventBtnSecondary"
                onClick={() => navigate(`/edit-event/${event._id}`)}
              />

              <EventBtn
                text="Delete"
                icon={<Trash size={16} />}
                className="eventBtnDanger"
                onClick={() => handleDeleteEvent(event._id)}
              />

              {/* Feedback for Completed Events */}
              {event.status === "Completed" && (
                <button
                  className="eventFeedbackBtn"
                  onClick={() => navigate(`/feedback/${event._id}`)}
                  type="button"
                >
                  <MessageSquarePlus size={16} />
                  <span>Feedback</span>
                </button>
              )}
            </div>
          )}
        </div>
      </footer>
    </article>
  );
};

export default EventCards;
