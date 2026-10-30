import cron from "node-cron";
import processExpiryReminders from "../utils/expiryReminders.js";

const startExpiryReminderJob = () => {
  cron.schedule("*/15 * * * *", async () => {
    try {
      await processExpiryReminders();
    } catch (error) {
      console.error("Expiry reminder job failed:", error.message);
    }
  });

  processExpiryReminders().catch((error) => {
    console.error("Expiry reminder startup run failed:", error.message);
  });
};

export default startExpiryReminderJob;
