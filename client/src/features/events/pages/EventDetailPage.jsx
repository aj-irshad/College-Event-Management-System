import { useContext, useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, CalendarDays, MapPin, Users, Check } from "lucide-react";

import eventContext from "../../../context/EventContext";
import authContext from "../../../context/authContext";
import socket from "../../../api/socket";
import { getEventById } from "../../../services/eventService";
import { getMyParticipation } from "../../../services/participantService";
import { formatDate, formatTime } from "../../../hooks/dateFormatter";

import "../styles/eventDetailPage.css";

const EventDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { events, eventLoading } = useContext(eventContext);
  const { isAdmin } = useContext(authContext);

  const contextEvent = events.find((item) => String(item._id) === String(id));
  const [fetchedEvent, setFetchedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [participationStatus, setParticipationStatus] = useState(location.state?.participationStatus || null);
  const [participationId, setParticipationId] = useState(location.state?.participationId || null);
  const [checkingParticipation, setCheckingParticipation] = useState(false);

  useEffect(() => {
    let active = true;
    setError("");
    setNotFound(false);
    setDeleted(false);

    if (contextEvent) {
      setFetchedEvent(contextEvent);
      setLoading(false);
      return () => {
        active = false;
      };
    }

    if (eventLoading) {
      setLoading(true);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    getEventById(id)
      .then(({ data }) => {
        if (active) setFetchedEvent(data.event || data);
      })
      .catch((requestError) => {
        if (active) {
          const status = requestError.response?.status;
          if (status === 404) setNotFound(true);
          else setError(requestError.response?.data?.message || "Could not load event details. Please try again.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, contextEvent, eventLoading]);

  const event = deleted ? null : contextEvent || fetchedEvent;

  useEffect(() => {
    let active = true;
    if (isAdmin || !event) {
      setCheckingParticipation(false);
      return undefined;
    }
    if (location.state?.participationStatus) {
      setParticipationStatus(location.state.participationStatus);
      setParticipationId(location.state.participationId || null);
      setCheckingParticipation(false);
      return undefined;
    }

    setParticipationStatus(null);
    setParticipationId(null);
    setCheckingParticipation(true);
    getMyParticipation()
      .then(({ data }) => {
        if (active) {
          const participation = Array.isArray(data) && data.find(
            (record) => String(record.event?._id || record.event) === String(event._id),
          );
          setParticipationId(participation?._id || null);
          setParticipationStatus(participation?.approvalStatus || (participation ? "Pending" : null));
        }
      })
      .catch(() => {
        if (active) {
          setParticipationId(null);
          setParticipationStatus(null);
        }
      })
      .finally(() => {
        if (active) setCheckingParticipation(false);
      });
    return () => {
      active = false;
    };
  }, [event?._id, isAdmin, location.state]);

  useEffect(() => {
    const handleApprovalUpdate = ({ participationId: updatedId, approvalStatus } = {}) => {
      if (updatedId && String(updatedId) === String(participationId) && approvalStatus) {
        setParticipationStatus(approvalStatus);
      }
    };
    socket.on("participation:status-updated", handleApprovalUpdate);
    return () => socket.off("participation:status-updated", handleApprovalUpdate);
  }, [participationId]);

  useEffect(() => {
    const handleDeleted = (payload) => {
      if (String(payload?._id) === String(id)) setDeleted(true);
    };
    socket.on("events:deleted", handleDeleted);
    return () => socket.off("events:deleted", handleDeleted);
  }, [id]);

  if (loading || (eventLoading && !event)) {
    return (
      <main className="event-page">
        <p role="status">Loading event details...</p>
      </main>
    );
  }

  if (error || notFound || !event) {
    return (
      <main className="event-page">
        <section className="event-not-found">
          <h2>{error ? "Unable to load event" : "Event not found"}</h2>
          <p>{error || "This event may have been removed or is not available to your account."}</p>
          <button
            type="button"
            onClick={() => navigate(getEventsBackPath(location.state?.from), { replace: true })}
            className="back-to-events"
          >
            <ArrowLeft size={17} />
            Back to Events
          </button>
        </section>
      </main>
    );
  }

  const priceDisplay =
    event.price && event.price > 0
      ? `Rs ${Number(event.price).toFixed(2)} Paid`
      : "Free";

  return (
    <main className="event-page">
      <button
        type="button"
        onClick={() => navigate(getEventsBackPath(location.state?.from))}
        className="back-to-events"
      >
        <ArrowLeft size={17} />
        Back to Events
      </button>

      <header className="event-page-header">
        <div className="event-page-badges">
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

        <h1>{event.title}</h1>

        <div className="event-page-meta-row">
          <span className="event-page-type">
            <Users size={16} aria-hidden="true" />
            {event.event_type}
          </span>
          {event.department && (
            <span className="event-page-department">{event.department}</span>
          )}
        </div>
      </header>

      <div className="event-page-info-card">
        <div className="event-info-item">
          <CalendarDays size={20} aria-hidden="true" />
          <div>
            <strong>Date & Time</strong>
            <p>
              {formatDate(event.start_at)} ({formatTime(event.start_at)} -{" "}
              {formatTime(event.end_at)})
            </p>
          </div>
        </div>

        <div className="event-info-item">
          <MapPin size={20} aria-hidden="true" />
          <div>
            <strong>Venue</strong>
            <p>{event.venue}</p>
          </div>
        </div>
      </div>

      <article className="event-page-content">
        <h3>About this event</h3>
        <p>{event.description}</p>
      </article>

      {/* Action CTA Section */}
      {!isAdmin && (
        <div className="event-page-actions">
          {checkingParticipation ? (
            <button type="button" className="event-page-btn event-btn-secondary" disabled>
              Checking registration…
            </button>
          ) : participationStatus === "Approved" ? (
            <button
              type="button"
              className="event-page-btn event-btn-success"
              disabled
            >
              <Check size={18} /> Approved · Registered
            </button>
          ) : participationStatus === "Pending" ? (
            <button type="button" className="event-page-btn event-btn-pending" disabled>
              Pending approval
            </button>
          ) : participationStatus === "Not Approved" ? (
            <button type="button" className="event-page-btn event-btn-rejected" disabled>
              Rejected
            </button>
          ) : event.status === "Upcoming" ? (
            <button
              type="button"
              className="event-page-btn event-btn-primary"
              onClick={() => navigate(`/participate/${event._id}`)}
            >
              {event.price && event.price > 0
                ? `Pay Rs ${event.price} & Participate`
                : "Participate Now"}
            </button>
          ) : (
            <button
              type="button"
              className="event-page-btn event-btn-secondary"
              disabled
            >
              Event {event.status}
            </button>
          )}
        </div>
      )}
    </main>
  );
};

const getEventsBackPath = (path) =>
  ["/upcoming-events", "/ongoing-events", "/completed-events"].includes(path)
    ? path
    : typeof path === "string" && /^\/search(?:\?.*)?$/.test(path)
      ? path
      : "/upcoming-events";

export default EventDetailPage;
