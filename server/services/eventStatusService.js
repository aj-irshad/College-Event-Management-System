import Event from "../model/events.js";

const getEventStatus = (start_at, end_at) => {
  const now = new Date();
  const start = new Date(start_at);
  const end = new Date(end_at);

  if (now < start) return "Upcoming";

  if (now >= start && now < end) return "Ongoing";

  return "Completed";
};

const updateEventStatus = async () => {
  const now = new Date();

  await Event.updateMany(
    {
      start_at: { $gt: now },
      status: { $ne: "Upcoming" },
    },
    { $set: { status: "Upcoming" } },
  );

  await Event.updateMany(
    {
      start_at: { $lte: now },
      end_at: { $gt: now },
      status: { $ne: "Ongoing" },
    },
    { $set: { status: "Ongoing" } },
  );

  await Event.updateMany({
    end_at: {
      $lte: now,
    },
    status: {
      $ne: "Completed",
    },
    $set: {
      status: "Completed",
    },
  });
};

export { getEventStatus, updateEventStatus };
