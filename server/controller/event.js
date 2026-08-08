import Event from "../model/events.js";

const getAllEvent = async (req, res) => {
  const allEvents = await Event.find();
  console.log(allEvents);
  res.status(200).json({
    allEvents,
  });
};

const createNewEvent = async (req, res) => {
  try {
    console.log(req.body);
    const { title, description, event_type, start_at, end_at, venue } =
      req.body;

    const eventCollision = await Event.find({
      start_at: { $lt: end_at },
      end_at: { $gt: start_at },
    });

    if (eventCollision.length > 0) {
      return res.status(409).json({
        message: "This event overlaps with an existing event.",
        eventCollision,
      });
    }

    const newEvent = {
      title: title,
      description: description,
      event_type: event_type,
      venue: venue,
      start_at: start_at,
      end_at: end_at,
    };

    console.log(newEvent);
    await Event.create(newEvent);

    res.status(201).json({
      message: "Successfully created new event",
      newEvent,
    });
  } catch (err) {
    console.error(err.message);
    res.satus(500).json({
      message: "Error creating new event",
    });
  }
};

export { createNewEvent, getAllEvent };
