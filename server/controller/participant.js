import Participant from "../model/participants.js";
import Event from "../model/events.js";
import Users from "../model/user.js";
import { getIO } from "../socket.js";
import { isEventAvailableToUser } from "../utils/eventTargeting.js";

const APPROVAL_STATUSES = ["Pending", "Approved", "Not Approved"];

// PARTICIPATE IN EVENT
const participateInEvent = async (req, res) => {
  try {
    const { eventId, participationType } = req.body;
    const userId = req.userId;

    // Check event exists
    const [event, user] = await Promise.all([
      Event.findById(eventId),
      Users.findById(userId).select("role department semester"),
    ]);

    if (!user) {
      return res.status(401).json({ message: "Please login" });
    }

    if (!event) {
      return res.status(404).json({
        message: "Event not found",
      });
    }

    if (!isEventAvailableToUser(event, user)) {
      return res.status(403).json({ message: "This event is not available to your department and semester" });
    }

    if (Number(event.price) > 0) {
      return res.status(402).json({
        message: "Paid event registration requires an approved payment submission",
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
    })
      .populate("event", "title event_type department start_at end_at status venue price")
      .sort({ createdAt: -1 });

    return res.status(200).json(
      participations.map((participation) => ({
        ...participation.toObject(),
        approvalStatus: participation.approvalStatus || "Pending",
      })),
    );
  } catch (err) {
    console.error(err.message);

    return res.status(500).json({
      message: "Failed to fetch participation",
    });
  }
};

// ADMIN: FETCH ALL PARTICIPANTS WITH USER & EVENT DETAILS
const getAllParticipantsAdmin = async (req, res) => {
  const {
    status = "All",
    role = "All",
    search = "",
    eventId = "",
    approvalStatus = "All",
  } = req.query;
  const validStatuses = ["All", "Upcoming", "Ongoing", "Completed"];
  const validRoles = ["All", "Participant", "Volunteer", "Organizing Member"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid event status filter" });
  }
  if (!validRoles.includes(role)) {
    return res.status(400).json({ message: "Invalid participation role filter" });
  }
  if (!["All", ...APPROVAL_STATUSES].includes(approvalStatus)) {
    return res.status(400).json({ message: "Invalid approval status filter" });
  }
  if (typeof search !== "string" || search.length > 100) {
    return res.status(400).json({ message: "Search must be 100 characters or fewer" });
  }
  if (eventId && !/^[a-f\d]{24}$/i.test(eventId)) {
    return res.status(400).json({ message: "Invalid event ID" });
  }

  try {
    const query = {};
    if (role !== "All") query.participationType = role;
    if (eventId) query.event = eventId;
    if (approvalStatus === "Pending") {
      // Older records without the field are Pending without requiring a migration.
      query.$or = [
        { approvalStatus: "Pending" },
        { approvalStatus: { $exists: false } },
      ];
    } else if (approvalStatus !== "All") {
      query.approvalStatus = approvalStatus;
    }

    const participants = await Participant.find(query)
      .populate("user", "name email contact department")
      .populate("event", "title event_type department start_at end_at status venue price")
      .sort({ createdAt: -1 });

    const normalizedSearch = search.trim().toLocaleLowerCase();
    const filteredParticipants = participants.filter((item) => {
      const event = item.event;
      if (!event) return false;
      if (status !== "All" && event.status !== status) return false;
      if (!normalizedSearch) return true;
      const user = item.user || {};
      const searchFields = [
        user.name,
        user.contact,
        user.department,
        event.department,
        event.title,
      ];
      return searchFields.some((value) =>
        String(value || "").toLocaleLowerCase().includes(normalizedSearch),
      );
    });

    return res.status(200).json(
      filteredParticipants.map((participation) => ({
        ...participation.toObject(),
        approvalStatus: participation.approvalStatus || "Pending",
      })),
    );
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({
      message: "Failed to fetch all participants roster",
    });
  }
};

// ADMIN: UPDATE A PARTICIPATION DECISION
const updateParticipationApproval = async (req, res) => {
  const { id } = req.params;
  const approvalStatus = req.body?.approvalStatus;

  if (!/^[a-f\d]{24}$/i.test(id)) {
    return res.status(400).json({ message: "Invalid participation ID" });
  }
  if (!APPROVAL_STATUSES.includes(approvalStatus)) {
    return res.status(400).json({ message: "Invalid approval status" });
  }

  try {
    const participation = await Participant.findById(id);
    if (!participation) {
      return res.status(404).json({ message: "Participation record not found" });
    }

    participation.approvalStatus = approvalStatus;
    await participation.save();

    try {
      getIO()
        .to(`user:${participation.user}`)
        .emit("participation:status-updated", {
          participationId: String(participation._id),
          approvalStatus: participation.approvalStatus,
        });
    } catch (socketError) {
      // The persisted REST update remains successful if sockets are unavailable.
      console.error("Failed to emit participation status update:", socketError.message);
    }

    return res.status(200).json({
      message: "Participation approval status updated",
      participation: {
        _id: participation._id,
        approvalStatus: participation.approvalStatus,
      },
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ message: "Failed to update participation status" });
  }
};

export {
  participateInEvent,
  getMyParticipation,
  getAllParticipantsAdmin,
  updateParticipationApproval,
};
