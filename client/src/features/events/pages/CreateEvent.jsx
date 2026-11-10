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
import EventAudienceTargets from "../components/EventAudienceTargets.jsx";
import "../styles/createEvent.css";

const CreateEvent = () => {
  const navigate = useNavigate();

  const { createEventContext } = useContext(eventContext);

  const [eventData, setEventData] = useState({
    title: "",
    description: "",
    event_type: "Conference",
    department: "",
    venue: "",
    start_at: "",
    end_at: "",
    price: 0,
    audienceTargets: [],
  });

  const [priceType, setPriceType] = useState("free"); // "free" or "paid"
  const [customEventType, setCustomEventType] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getCurrentDateTime = () => {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;

    setEventData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePriceTypeChange = (e) => {
    const value = e.target.value;
    setPriceType(value);

    if (value === "free") {
      setEventData((prev) => ({
        ...prev,
        price: 0,
      }));
    } else {
      setEventData((prev) => ({
        ...prev,
        price: "",
      }));
    }
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
      if (new Date(eventData.start_at) < new Date()) {
        setError("Event start date and time cannot be in the past.");
        setLoading(false);
        return;
      }

      if (new Date(eventData.end_at) <= new Date(eventData.start_at)) {
        setError(
          "Event end date and time must be after the start date and time.",
        );
        setLoading(false);
        return;
      }

      if (eventData.event_type === "Other" && !customEventType.trim()) {
        setError("Please enter an event type.");
        setLoading(false);
        return;
      }

      if (
        eventData.audienceTargets.some((target) => !target.semesters?.length)
      ) {
        setError("Select at least one semester for every targeted department.");
        setLoading(false);
        return;
      }

      if (
        priceType === "paid" &&
        (!eventData.price || Number(eventData.price) <= 0)
      ) {
        setError("Please enter a valid ticket price amount.");
        setLoading(false);
        return;
      }

      const finalEventData = {
        ...eventData,
        // Convert the browser-local datetime input to an absolute UTC instant,
        // matching the existing edit form's Date serialization.
        start_at: new Date(eventData.start_at).toISOString(),
        end_at: new Date(eventData.end_at).toISOString(),
        event_type:
          eventData.event_type === "Other"
            ? customEventType.trim()
            : eventData.event_type,
        price: priceType === "free" ? 0 : Number(eventData.price),
      };

      await createEventContext(finalEventData);

      alert("Successfully created event");
      navigate("/upcoming-events");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "An unexpected error occurred.",
      );
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
                  className="custom-input-spacing"
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

          <EventAudienceTargets
            value={eventData.audienceTargets}
            onChange={(audienceTargets) =>
              setEventData((prev) => ({ ...prev, audienceTargets }))
            }
          />

          {/* <div className="form-row">
            <div className="form-group">
              <label htmlFor="department">Department (optional)</label>
              <input
                type="text"
                id="department"
                name="department"
                placeholder="e.g. Computer Science"
                value={eventData.department}
                onChange={handleChange}
              />
            </div>
          </div> */}

          {/* Ticket Pricing (Free / Paid) */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="priceType">Participation Type</label>

              <select
                id="priceType"
                value={priceType}
                onChange={handlePriceTypeChange}
                required
              >
                <option value="free">Free Participation</option>
                <option value="paid">Paid Ticket</option>
              </select>
            </div>

            {priceType === "paid" ? (
              <div className="form-group">
                <label htmlFor="price">Ticket Amount (Rs)</label>

                <input
                  type="number"
                  id="price"
                  name="price"
                  step="10"
                  placeholder="e.g. 500.00"
                  value={eventData.price}
                  onChange={handleChange}
                  required
                />
              </div>
            ) : (
              <div className="form-group">
                <label>Ticket Cost</label>
                <input
                  type="text"
                  value="Rs 0.00 (Free)"
                  disabled
                  className="disabled-input-field"
                />
              </div>
            )}
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
                min={getCurrentDateTime()}
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
                min={eventData.start_at || undefined}
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
