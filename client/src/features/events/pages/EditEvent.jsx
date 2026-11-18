import { useEffect, useState, useContext } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Paperclip, X } from "lucide-react";

import eventContext from "../../../context/EventContext.jsx";
import "../styles/editEvent.css";

import { getEventById, updateEvent } from "../../../services/eventService.js";
import EventAudienceTargets from "../components/EventAudienceTargets.jsx";
import { useNotifications } from "../../../context/NotificationContext.jsx";

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
  const [editAudienceTargets, setEditAudienceTargets] = useState([]);
  const [existingAttachments, setExistingAttachments] = useState([]);
  const [newAttachments, setNewAttachments] = useState([]);
  const [initialAttachmentIds, setInitialAttachmentIds] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [saving, setSaving] = useState(false);

  const { events, setEvents, eventLoading } = useContext(eventContext);

  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useNotifications();

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
      setEditAudienceTargets(
        Array.isArray(event.audienceTargets) ? event.audienceTargets : [],
      );
      const attachments = Array.isArray(event.attachments) ? event.attachments : [];
      setExistingAttachments(attachments);
      setInitialAttachmentIds(attachments.map((attachment) => String(attachment._id)));
      setNewAttachments([]);

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
    if (saving) return;

    // Enforce end time is strictly greater than start time
    if (new Date(editEndAt) <= new Date(editStartAt)) {
      notify("warning",
        "End date and time must be strictly after the start date and time.",
      );
      return;
    }

    if (priceType === "paid" && (!editPrice || Number(editPrice) <= 0)) {
      notify("warning", "Please enter a valid ticket price amount.");
      return;
    }

    if (editAudienceTargets.some((target) => !target.semesters?.length)) {
      notify("warning", "Select at least one semester for every targeted department.");
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
      audienceTargets: editAudienceTargets,
    };

    try {
      setSaving(true);
      setUploadProgress(0);
      const keptIds = new Set(existingAttachments.map((attachment) => String(attachment._id)));
      const removeAttachmentIds = initialAttachmentIds.filter((attachmentId) => !keptIds.has(attachmentId));
      const response = await updateEvent(id, updatedEvent, newAttachments, removeAttachmentIds, (event) => {
        if (event.total) setUploadProgress(Math.round((event.loaded / event.total) * 100));
      });

      setEvents((previous) =>
        [
          ...previous.filter((item) => item._id.toString() !== id),
          response.data.event,
        ].sort((a, b) => new Date(b.start_at) - new Date(a.start_at)),
      );

      notify("success", "Successfully updated event info.");
      navigate("/upcoming-events");
    } catch (err) {
      notify("error", err.response?.data?.message || "Failed to update event.");
    } finally {
      setSaving(false);
    }
  };

  const addAttachments = (files) => {
    const allowed = new Set([".pdf", ".doc", ".docx", ".ppt", ".pptx", ".jpg", ".jpeg", ".png", ".webp"]);
    const next = [...newAttachments];
    let warning = "";
    for (const file of files) {
      const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;
      if (!allowed.has(extension)) {
        warning = "Choose PDF, DOC, DOCX, PPT, PPTX, JPG, JPEG, PNG, or WEBP files only.";
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        warning = `${file.name} is larger than the 5 MB per-file limit.`;
        continue;
      }
      if (existingAttachments.length + next.length >= 5) {
        warning = "An event can have at most 5 attachments.";
        break;
      }
      next.push(file);
    }
    setNewAttachments(next);
    if (warning) notify("warning", warning);
  };

  const formatFileSize = (size) => size < 1024 * 1024
    ? `${Math.max(1, Math.round(size / 1024))} KB`
    : `${(size / (1024 * 1024)).toFixed(1)} MB`;

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

            <EventAudienceTargets
              value={editAudienceTargets}
              onChange={setEditAudienceTargets}
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

            {/* <label htmlFor="eventDepartment">Department (optional):</label>
            <input
              type="text"
              id="eventDepartment"
              value={editDepartment}
              onChange={(e) => setEditDepartment(e.target.value)}
            /> */}

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

            <section className="edit-event-attachments" aria-labelledby="edit-event-attachments-heading">
              <div className="edit-event-attachments-heading">
                <h3 id="edit-event-attachments-heading"><Paperclip size={18} /> Event attachments <span>(optional)</span></h3>
                <p>PDF, DOC, DOCX, PPT, PPTX, JPG, JPEG, PNG, or WEBP · up to 5 MB each · maximum 5 files</p>
                <label className="edit-event-attachment-select">
                  Add files
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.webp"
                    multiple
                    disabled={saving || existingAttachments.length + newAttachments.length >= 5}
                    onChange={(event) => {
                      addAttachments(Array.from(event.target.files || []));
                      event.target.value = "";
                    }}
                  />
                </label>
              </div>
              {(existingAttachments.length > 0 || newAttachments.length > 0) ? (
                <ul className="edit-event-attachment-list">
                  {existingAttachments.map((attachment) => (
                    <li key={attachment._id}>
                      <span className="edit-event-attachment-name">{attachment.originalFilename}</span>
                      <span>{attachment.format?.toUpperCase()} · {formatFileSize(attachment.size || 0)}</span>
                      <button type="button" aria-label={`Remove ${attachment.originalFilename}`} disabled={saving} onClick={() => setExistingAttachments((current) => current.filter((item) => String(item._id) !== String(attachment._id)))}>
                        <X size={16} /> Remove
                      </button>
                    </li>
                  ))}
                  {newAttachments.map((file, index) => (
                    <li key={`${file.name}-${file.size}-${index}`}>
                      <span className="edit-event-attachment-name">{file.name}</span>
                      <span>{formatFileSize(file.size)}</span>
                      <button type="button" aria-label={`Remove ${file.name}`} disabled={saving} onClick={() => setNewAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                        <X size={16} /> Remove
                      </button>
                    </li>
                  ))}
                </ul>
              ) : <p className="edit-event-attachments-empty">No attachments added.</p>}
              {saving && newAttachments.length > 0 && (
                <div className="event-attachment-progress" role="status">
                  <div><span>Uploading attachments</span><span>{uploadProgress}%</span></div>
                  <progress max="100" value={uploadProgress} />
                </div>
              )}
            </section>

            <button type="submit" disabled={saving}>{saving ? "Updating…" : "Update Event"}</button>
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
