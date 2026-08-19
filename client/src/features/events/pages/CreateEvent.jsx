import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Tag,
  FileText,
  Clock,
} from "lucide-react";

import eventContext from "../../../context/EventContext.jsx";
import "../styles/createEvent.css";

const CreateEvent = () => {
  const navigate = useNavigate();

  const { createEventContext } = useContext(eventContext);

  const [eventData, setEventData] = useState({
    title: "",
    description: "",
    event_type: "Conference",
    venue: "",
    start_at: "",
    end_at: "",
  });

  const [customEventType, setCustomEventType] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setEventData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEventTypeChange = (e) => {
    const value = e.target.value;

    setEventData((prev) => ({
      ...prev,
      event_type: value,
    }));

    // Clear custom type when switching away from Other
    if (value !== "Other") {
      setCustomEventType("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      // Use custom event type when "Other" is selected
      const finalEventData = {
        ...eventData,
        event_type:
          eventData.event_type === "Other"
            ? customEventType.trim()
            : eventData.event_type,
      };

      // Prevent submitting an empty custom event type
      if (eventData.event_type === "Other" && !customEventType.trim()) {
        setError("Please enter an event type.");
        setLoading(false);
        return;
      }

      await createEventContext(finalEventData);

      navigate("/upcoming-events");
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-event-wrapper">
      <header className="create-event-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>

        <div className="create-event-title">
          <h1>Create New Event</h1>

          <p>
            Fill in the details below to publish a new event to the platform.
          </p>
        </div>
      </header>

      <div className="content-card form-card">
        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="event-form">
          {/* Event Title */}
          <div className="form-group">
            <label htmlFor="title">
              <FileText size={16} />
              Event Title
            </label>

            <input
              type="text"
              id="title"
              name="title"
              placeholder="e.g. Tech Innovators Summit 2026"
              value={eventData.title}
              onChange={handleChange}
              required
            />
          </div>

          {/* Event Type + Venue */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="event_type">
                <Tag size={16} />
                Event Type
              </label>

              <select
                id="event_type"
                name="event_type"
                value={eventData.event_type}
                onChange={handleEventTypeChange}
                required
              >
                <option value="Conference">Conference</option>
                <option value="Workshop">Workshop</option>
                <option value="Seminar">Seminar</option>
                <option value="Webinar">Webinar</option>
                <option value="Meetup">Meetup</option>
                <option value="Other">Other</option>
              </select>

              {eventData.event_type === "Other" && (
                <input
                  type="text"
                  placeholder="Enter event type"
                  value={customEventType}
                  onChange={(e) => setCustomEventType(e.target.value)}
                  required
                />
              )}
            </div>

            <div className="form-group">
              <label htmlFor="venue">
                <MapPin size={16} />
                Venue / Location
              </label>

              <input
                type="text"
                id="venue"
                name="venue"
                placeholder="e.g. Main Auditorium or Zoom Link"
                value={eventData.venue}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Start + End */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start_at">
                <Calendar size={16} />
                Start Date & Time
              </label>

              <input
                type="datetime-local"
                id="start_at"
                name="start_at"
                value={eventData.start_at}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="end_at">
                <Clock size={16} />
                End Date & Time
              </label>

              <input
                type="datetime-local"
                id="end_at"
                name="end_at"
                value={eventData.end_at}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="description">
              <FileText size={16} />
              Event Description
            </label>

            <textarea
              id="description"
              name="description"
              rows="5"
              placeholder="Provide a detailed overview of what attendees can expect..."
              value={eventData.description}
              onChange={handleChange}
              required
            />
          </div>

          {/* Buttons */}
          <div className="form-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={() => navigate(-1)}
            >
              Cancel
            </button>

            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? "Publishing..." : "Publish Event"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEvent;
