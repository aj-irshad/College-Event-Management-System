import Event from "../model/events.js";
import { getIO } from "../socket.js";

import {
  getEventStatus,
  updateEventStatus,
} from "../services/eventStatusService.js";

import sendEventNotifications from "../utils/eventNotifications.js";
import createNotification, {
  maybeCreateEventExpiryReminder,
} from "../utils/bellNotification.js";

const getAllEvent = async (req, res) => {
  try {
    const allEvents = await Event.find().sort({ start_at: -1 });

    return res.status(200).json(allEvents);
  } catch (err) {
    console.error(err.message);

    return res.status(500).json({
      message: "Failed to fetch events",
    });
  }
};

const createNewEvent = async (req, res) => {
  try {
    const { title, description, event_type, start_at, end_at, venue, price } =
      req.body;

    const status = getEventStatus(start_at, end_at);

    const newEventData = {
      title: title,
      description: description,
      event_type: event_type,
      venue: venue,
      start_at: start_at,
      end_at: end_at,
      price: price !== undefined ? Number(price) : 0,
      status,
    };

    const createdEvent = await Event.create(newEventData);

    const io = getIO();
    io.emit("newEvent", createdEvent);

    setImmediate(() => {
      void sendEventNotifications(createdEvent);
    });

    createNotification(
      "New Event Added!",
      `A new event "${createdEvent.title}" has been published.`,
      "event",
      createdEvent._id,
    ).catch((err) => console.error("Background notification error:", err));

    maybeCreateEventExpiryReminder(createdEvent).catch((err) =>
      console.error("Background expiry reminder error:", err),
    );

    return res.status(201).json({
      message: "Successfully created new event",
      event: createdEvent,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({
      message: "Error creating new event",
    });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const deletedEvent = await Event.findByIdAndDelete(eventId);

    if (!deletedEvent) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    res.status(200).json({
      message: "Event deleted successfully",
    });
  } catch (err) {
    res.status(500).json({
      message: "Failed to delete event",
    });
  }
};

const updateEvent = async (req, res) => {
  try {
    const eventId = req.params.eventId;
    const eventData = req.body;

    const event = await Event.findByIdAndUpdate(eventId, eventData, {
      returnDocument: "after",
      runValidators: true,
    });

    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    res.json({
      message: "Event updated",
      event: event,
    });
  } catch (err) {
    return res.json({
      message: "Failed to update event",
      error: err.message,
    });
  }
};

export { createNewEvent, getAllEvent, deleteEvent, updateEvent };
