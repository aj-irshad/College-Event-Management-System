import Participant from "../model/participants.js";
import Event from "../model/events.js";

// PARTICIPATE IN EVENT
const participateInEvent = async (req, res) => {
  try {
    const { eventId, participationType } = req.body;
    const userId = req.userId;

    // Check event exists
    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    // Check if already participated
    const existingParticipant = await Participant.findOne({
      event: eventId,
      user: userId,
    });

    if (existingParticipant) {
      return res.status(409).json({
        message: "You have already participated in this event",
      });
    }

    const participant = await Participant.create({
      event: eventId,
      user: userId,
      participationType,
    });

    return res.status(201).json({
      message: "Successfully participated in event",
      participant,
    });
  } catch (err) {
    console.error(err.message);

    return res.status(500).json({
      message: "Failed to participate in event",
    });
  }
};

// USER PARTICIPATION LIST
const getMyParticipation = async (req, res) => {
  try {
    const userId = req.userId;

    const participations = await Participant.find({
      user: userId,
    }).populate("event");

    return res.status(200).json(participations);
  } catch (err) {
    console.error(err.message);

    return res.status(500).json({
      message: "Failed to fetch participation",
    });
  }
};

export { participateInEvent, getMyParticipation };
