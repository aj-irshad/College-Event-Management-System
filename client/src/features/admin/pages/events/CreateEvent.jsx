import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Tag,
  FileText,
  Clock,
} from "lucide-react";
import "../../styles/createEvent.css";

import { createEvent } from "../../../../services/eventService";

const CreateEvent = () => {
  const navigate = useNavigate();

  // Event state aligned with MongoDB schema fields
  const [eventData, setEventData] = useState({
    title: "",
    description: "",
    event_type: "Conference",
    venue: "",
    start_at: "",
    end_at: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setEventData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      await createEvent(eventData);
      console.log(`New event successfully created: ${eventData}`);
      navigate("/");
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
          <ArrowLeft size={18} /> Back
        </button>

        <h1 className="dashboard-title">Create New Event</h1>

        <p className="dashboard-subtitle">
          Fill in the details below to publish a new event to the platform.
        </p>
      </header>

      <div className="content-card form-card">
        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="event-form">
          <div className="form-group">
            <label htmlFor="title">
              <FileText size={16} /> Event Title
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

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="event_type">
                <Tag size={16} /> Event Type
              </label>

              <select
                id="event_type"
                name="event_type"
                value={eventData.event_type}
                onChange={handleChange}
                required
              >
                <option value="Conference">Conference</option>
                <option value="Workshop">Workshop</option>
                <option value="Seminar">Seminar</option>
                <option value="Webinar">Webinar</option>
                <option value="Meetup">Meetup</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="venue">
                <MapPin size={16} /> Venue / Location
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

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start_at">
                <Calendar size={16} /> Start Date & Time
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
                <Clock size={16} /> End Date & Time
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

          <div className="form-group">
            <label htmlFor="description">
              <FileText size={16} /> Event Description
            </label>

            <textarea
              id="description"
              name="description"
              rows="5"
              placeholder="Provide a detailed overview of what attendees can expect..."
              value={eventData.description}
              onChange={handleChange}
              required
            ></textarea>
          </div>

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
