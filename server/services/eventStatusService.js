import Event from "../model/events.js";

const getEventStatus = (start_at, end_at) => {
  const start = new Date(start_at);
  const end = new Date(end_at);
  const now = new Date();

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Invalid event dates");
  }
  if (end <= start) {
    throw new Error("Event end date and time must be after the start date and time");
  }

  if (now < start) return "Upcoming";
  if (now < end) return "Ongoing";
  return "Completed";
};

const validEventDateRange = {
  $expr: {
    $and: [
      { $eq: [{ $type: "$start_at" }, "date"] },
      { $eq: [{ $type: "$end_at" }, "date"] },
      { $lt: ["$start_at", "$end_at"] },
    ],
  },
};
const MAX_RECONCILE_PASSES = 4;

const updateStatusWhere = (condition, status) =>
  Event.updateMany(
    {
      status: { $ne: status },
      $expr: {
        $and: [...validEventDateRange.$expr.$and, condition],
      },
    },
    { $set: { status } },
  );

// Conditions use MongoDB's $$NOW and are atomic per document. Sequential
// transitions prevent a start-boundary update from racing an end-boundary pass.
const updateEventStatus = async () => {
  let changedAny = false;
  let changedThisPass;
  let passes = 0;

  // Repeat only while a pass made changes, covering a transition that crosses
  // its boundary while the MongoDB updates are in flight.
  do {
    passes += 1;
    const upcoming = await updateStatusWhere(
      { $gt: ["$start_at", "$$NOW"] },
      "Upcoming",
    );
    const ongoing = await updateStatusWhere(
      {
        $and: [
          { $lte: ["$start_at", "$$NOW"] },
          { $gt: ["$end_at", "$$NOW"] },
        ],
      },
      "Ongoing",
    );
    const completed = await updateStatusWhere(
      { $lte: ["$end_at", "$$NOW"] },
      "Completed",
    );
    const results = [upcoming, ongoing, completed];

    changedThisPass = results.some((result) => result.modifiedCount > 0);
    changedAny ||= changedThisPass;
  } while (changedThisPass && passes < MAX_RECONCILE_PASSES);

  return changedAny;
};

export { getEventStatus, updateEventStatus, validEventDateRange };
