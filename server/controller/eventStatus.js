import { updateEventStatus } from "../services/eventStatusService.js";

const syncEventStatus = async (req, res) => {
  try {
    await updateEventStatuses();

    return res.status(200).json({
      message: "Event statuses updated successfully",
    });
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({
      message: "Failed to update event statuses",
    });
  }
};

export default syncEventStatus;
