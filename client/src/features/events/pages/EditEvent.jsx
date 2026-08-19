import { useEffect, useState, useContext } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";

import eventContext from "../../../context/EventContext.jsx";
import "../styles/editEvent.css";

import { updateEvent } from "../../../services/eventService.js";
// import { getEvent, updateEvent } from "../../../services/eventService.js";

const EditEvent = () => {
  const formatDateTimeLocal = (date) => {
    const d = new Date(date);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const [editStatus, setEditStatus] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editEventType, setEditEventType] = useState("");
  const [editStartAt, setEditStartAt] = useState("");
  const [editEndAt, setEditEndAt] = useState("");
  const [editVenue, setEditVenue] = useState("");

  const { events, setEvents } = useContext(eventContext);

  const { id } = useParams();
  const navigate = useNavigate();

  const event = events.find((event) => event._id.toString() === id);

  // Load existing event data into the form
  useEffect(() => {
    if (event) {
      setEditTitle(event.title);
      setEditDescription(event.description);
      setEditEventType(event.event_type);
      setEditStartAt(formatDateTimeLocal(event.start_at));
      setEditEndAt(formatDateTimeLocal(event.end_at));
      setEditVenue(event.venue);
      setEditStatus(event.status);
    }
  }, [event]);

  const handleEdit = async (id) => {
    const updatedEvent = {
      title: editTitle,
      description: editDescription,
      event_type: editEventType,
      start_at: new Date(editStartAt),
      end_at: new Date(editEndAt),
      venue: editVenue,
      status: editStatus,
    };

    try {
      const response = await updateEvent(id, updatedEvent);

      const newEventData = events.map((event) =>
        event._id.toString() === id ? response.data.event : event,
      );
      setEvents(newEventData);

      navigate("/upcoming-events");
    } catch (err) {
      console.error(`Error updating event: ${err.message}`);
    }
  };

  return (
    <main className="editEvent">
      {event ? (
        <>
          <h2>Edit Event</h2>

          <form
            className="editEventForm"
            onSubmit={(e) => {
              e.preventDefault();
              handleEdit(event._id);
            }}
          >
            <label htmlFor="eventTitle">Title:</label>
            <input
              autoFocus
              type="text"
              id="eventTitle"
              required
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
            />

            <label htmlFor="eventDescription">Description:</label>
            <textarea
              id="eventDescription"
              required
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
            />

            <label htmlFor="eventType">Event Type:</label>
            <input
              type="text"
              id="eventType"
              required
              value={editEventType}
              onChange={(e) => setEditEventType(e.target.value)}
            />

            <label htmlFor="eventStatus">Status:</label>

            <select
              id="eventStatus"
              required
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
            >
              <option value="">Select status</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Ongoing">Ongoing</option>
              <option value="Completed">Completed</option>
            </select>

            <label htmlFor="startAt">Start Date & Time:</label>
            <input
              type="datetime-local"
              id="startAt"
              required
              value={editStartAt}
              onChange={(e) => setEditStartAt(e.target.value)}
            />

            <label htmlFor="endAt">End Date & Time:</label>
            <input
              type="datetime-local"
              id="endAt"
              required
              value={editEndAt}
              onChange={(e) => setEditEndAt(e.target.value)}
            />

            <label htmlFor="venue">Venue:</label>
            <input
              type="text"
              id="venue"
              required
              value={editVenue}
              onChange={(e) => setEditVenue(e.target.value)}
            />

            <button type="submit">Update Event</button>
          </form>
        </>
      ) : (
        <>
          <h2>Event not found</h2>

          <p>Sorry, the event you are looking for does not exist.</p>

          <p>
            <Link to="/events">Go to Events</Link>
          </p>
        </>
      )}
    </main>
  );
};

export default EditEvent;
