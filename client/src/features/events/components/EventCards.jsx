import {
  Users,
  CalendarDays,
  MapPin,
  Trash,
  Edit,
  MessageSquarePlus,
  Check,
} from "lucide-react";

import { useContext } from "react";
import { useNavigate } from "react-router-dom";

import eventContext from "../../../context/EventContext";
import { formatDate, formatTime } from "../../../hooks/dateFormatter.js";

import "../styles/eventcard.css";

const EventCards = ({ event, isAdmin, hasParticipated }) => {
  const navigate = useNavigate();
  const { deleteEventContext } = useContext(eventContext);

  const handleDeleteEvent = async (eventId) => {
    await deleteEventContext(eventId);
  };

  // Determine pricing display text
  const priceDisplay =
    event.price && event.price > 0
      ? `Rs ${Number(event.price).toFixed(2)} Paid`
      : "Free";

  return (
    <article className="eventCard">
      {/* Top Header / Badges Row (Replaces the image banner) */}
      <div className="eventCard-header-badges">
        <span
          className={`eventStatus-badge eventStatus-${(
            event.status || "Upcoming"
          ).toLowerCase()}`}
        >
          {event.status || "Upcoming"}
        </span>
        <span
          className={`eventPrice-badge ${
            event.price && event.price > 0 ? "paid" : "free"
          }`}
        >
          {priceDisplay}
        </span>
      </div>

      {/* Main Content Body */}
      <div className="eventCard-body">
        <div className="eventCard-type-wrapper">
          <span className="eventCard-type">
            <Users size={14} aria-hidden="true" />
            {event.event_type}
          </span>
        </div>

        <h2 className="eventCard-title" title={event.title}>
          {event.title}
        </h2>

        <p className="eventCard-description">{event.description}</p>

        {/* Event Metadata (Date, Time, Venue) */}
        <div className="eventCard-meta">
          <div className="eventCard-meta-item">
            <CalendarDays size={16} aria-hidden="true" />
            <span>
              {formatDate(event.start_at)} • {formatTime(event.start_at)} -{" "}
              {formatTime(event.end_at)}
            </span>
          </div>

          <div className="eventCard-meta-item">
            <MapPin size={16} aria-hidden="true" />
            <span className="eventCard-venue">{event.venue}</span>
          </div>
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="eventCard-footer">
        {!isAdmin ? (
          <div className="eventCard-actions">
            {hasParticipated ? (
              <button
                type="button"
                className="eventCard-btn eventCard-btn-success"
                disabled
              >
                <Check size={16} /> Registered
              </button>
            ) : event.status === "Upcoming" ? (
              <button
                type="button"
                className="eventCard-btn eventCard-btn-primary"
                onClick={() => navigate(`/participate/${event._id}`)}
              >
                {event.price && event.price > 0
                  ? `Pay Rs ${event.price}`
                  : "Participate"}
              </button>
            ) : (
              <button
                type="button"
                className="eventCard-btn eventCard-btn-secondary"
                disabled
              >
                {event.status}
              </button>
            )}
          </div>
        ) : (
          <div className="eventCard-actions admin-actions">
            <button
              type="button"
              className="eventCard-btn eventCard-btn-secondary"
              onClick={() => navigate(`/edit-event/${event._id}`)}
            >
              <Edit size={16} /> Edit
            </button>

            <button
              type="button"
              className="eventCard-btn eventCard-btn-danger"
              onClick={() => handleDeleteEvent(event._id)}
            >
              <Trash size={16} /> Delete
            </button>

            {event.status === "Completed" && (
              <button
                type="button"
                className="eventCard-btn eventCard-btn-primary feedback-btn"
                onClick={() => navigate(`/feedback/${event._id}`)}
              >
                <MessageSquarePlus size={16} /> Feedback
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
};

export default EventCards;
