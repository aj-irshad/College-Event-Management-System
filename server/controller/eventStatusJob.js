import cron from "node-cron";
import { updateEventStatus } from "../services/eventStatusService.js";

const startEventStatusJob = () => {
  cron.schedule("* * * * *", async () => {
    try {
      await updateEventStatuses();
      console.log("Event statuses synchronized");
    } catch (err) {
      console.error("Event status update failed:", err.message);
    }
  });
};

export default startEventStatusJob;
