import { useEffect, useState, useContext } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";

import eventContext from "../../../context/EventContext.jsx";
import "../styles/editEvent.css";

import { getEventById, updateEvent } from "../../../services/eventService.js";

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

  const [editDepartment, setEditDepartment] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editEventType, setEditEventType] = useState("");
  const [editStartAt, setEditStartAt] = useState("");
  const [editEndAt, setEditEndAt] = useState("");
  const [editVenue, setEditVenue] = useState("");
  const [editPrice, setEditPrice] = useState(0);
  const [priceType, setPriceType] = useState("free");

  const { events, setEvents, eventLoading } = useContext(eventContext);

  const { id } = useParams();
  const navigate = useNavigate();

  const contextEvent = events.find((event) => event._id.toString() === id);
  const [fetchedEvent, setFetchedEvent] = useState(null);
  const event = contextEvent || fetchedEvent;

  useEffect(() => {
    if (contextEvent || eventLoading) return;
    let active = true;
    getEventById(id)
      .then((response) => {
        if (active) setFetchedEvent(response.data);
      })
      .catch(() => {
        if (active) setFetchedEvent(null);
      });
    return () => {
      active = false;
    };
  }, [contextEvent, eventLoading, id]);

  // Load existing event data into the form
  useEffect(() => {
    if (event) {
      setEditTitle(event.title);
      setEditDescription(event.description);
      setEditEventType(event.event_type);
      setEditStartAt(formatDateTimeLocal(event.start_at));
      setEditEndAt(formatDateTimeLocal(event.end_at));
      setEditVenue(event.venue);
      setEditDepartment(event.department || "");

      const eventPrice = event.price !== undefined ? event.price : 0;
      setEditPrice(eventPrice);
      setPriceType(eventPrice > 0 ? "paid" : "free");
    }
  }, [event]);

  const handlePriceTypeChange = (e) => {
    const value = e.target.value;
    setPriceType(value);

    if (value === "free") {
      setEditPrice(0);
    } else if (editPrice === 0) {
      setEditPrice("");
    }
  };

  const handleEdit = async (e, id) => {
    e.preventDefault();

    // Enforce end time is strictly greater than start time
    if (new Date(editEndAt) <= new Date(editStartAt)) {
      alert(
        "End date and time must be strictly after the start date and time.",
      );
      return;
    }

    if (priceType === "paid" && (!editPrice || Number(editPrice) <= 0)) {
      alert("Please enter a valid ticket price amount.");
      return;
    }

    const updatedEvent = {
      title: editTitle,
      description: editDescription,
      event_type: editEventType,
      department: editDepartment,
      start_at: new Date(editStartAt),
      end_at: new Date(editEndAt),
      venue: editVenue,
      price: priceType === "free" ? 0 : Number(editPrice),
    };

    try {
      const response = await updateEvent(id, updatedEvent);

      setEvents((previous) =>
        [...previous.filter((item) => item._id.toString() !== id), response.data.event]
          .sort((a, b) => new Date(b.start_at) - new Date(a.start_at)),
      );

      alert("Successfully updated event info.");
      navigate("/upcoming-events");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update event.");
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
              handleEdit(e, event._id);
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

            {/* Admission Type Selection */}
            <label htmlFor="priceType">Participation Type:</label>
            <select
              id="priceType"
              required
              value={priceType}
              onChange={handlePriceTypeChange}
            >
              <option value="free">Free Participation</option>
              <option value="paid">Paid Ticket</option>
            </select>

            {/* Conditional Price Amount Input */}
            {priceType === "paid" && (
              <>
                <label htmlFor="editPrice">Ticket Amount (Rs):</label>
                <input
                  type="number"
                  id="editPrice"
                  step="10"
                  required
                  placeholder="e.g. 500.00"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                />
              </>
            )}

            <label htmlFor="eventDepartment">Department (optional):</label>
            <input
              type="text"
              id="eventDepartment"
              value={editDepartment}
              onChange={(e) => setEditDepartment(e.target.value)}
            />

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
              min={editStartAt} // Dynamically restricts selecting a time earlier than the start date/time
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

          <p>
            {eventLoading
              ? "Loading event..."
              : "Sorry, the event you are looking for does not exist."}
          </p>

          <p>
            <Link to="/events">Go to Events</Link>
          </p>
        </>
      )}
    </main>
  );
};

export default EditEvent;
