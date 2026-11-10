import mongoose from "mongoose";
import Event from "../model/events.js";
import { emitEventStatusRefresh } from "../socket.js";
import { updateEventStatus, validEventDateRange } from "../services/eventStatusService.js";

const MAX_TIMER_DELAY = 2 ** 31 - 1;
const isDebugEventSocket = () => process.env.DEBUG_EVENT_SOCKET === "true";

let timer = null;
let started = false;
let refreshPromise = null;
let refreshRequested = false;

const clearScheduledTransition = () => {
  if (timer) clearTimeout(timer);
  timer = null;
};

const emitStatusesUpdated = async () => {
  try {
    emitEventStatusRefresh();
    if (isDebugEventSocket()) {
      console.info("[event-socket] emitted", {
        pid: process.pid,
        eventName: "events:statuses-updated",
      });
    }
  } catch (error) {
    console.error("Failed to emit event status update:", error.message);
  }
};

const getNextTransitionDelay = async () => {
  const [nextTransition] = await Event.aggregate([
    {
      $match: {
        status: { $in: ["Upcoming", "Ongoing"] },
        $expr: validEventDateRange.$expr,
      },
    },
    {
      $project: {
        transitionAt: {
          $cond: [
            { $eq: ["$status", "Upcoming"] },
            "$start_at",
            "$end_at",
          ],
        },
      },
    },
    { $sort: { transitionAt: 1 } },
    { $limit: 1 },
    { $project: { delayMs: { $subtract: ["$transitionAt", "$$NOW"] } } },
  ]);

  return Number.isFinite(nextTransition?.delayMs) ? nextTransition.delayMs : null;
};

const reconcileAndSchedule = async () => {
  clearScheduledTransition();

  const changed = await updateEventStatus();
  if (changed) await emitStatusesUpdated();
  if (mongoose.connection.readyState !== 1) return;

  const delayUntilTransition = await getNextTransitionDelay();
  if (delayUntilTransition === null || mongoose.connection.readyState !== 1) return;

  const delay = Math.max(
    0,
    Math.min(delayUntilTransition, MAX_TIMER_DELAY),
  );
  timer = setTimeout(() => {
    timer = null;
    void refreshEventStatusSchedule().catch((error) => {
      console.error("Event status transition failed:", error.message);
    });
  }, delay);
  timer.unref?.();
};

const refreshEventStatusSchedule = () => {
  if (!started) return Promise.resolve();

  refreshRequested = true;
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    do {
      refreshRequested = false;
      if (mongoose.connection.readyState !== 1) {
        clearScheduledTransition();
        break;
      }
      await reconcileAndSchedule();
    } while (refreshRequested && mongoose.connection.readyState === 1);
  })().finally(() => {
    refreshPromise = null;
    if (refreshRequested && mongoose.connection.readyState === 1) {
      void refreshEventStatusSchedule().catch((error) => {
        console.error("Event status scheduling refresh failed:", error.message);
      });
    }
  });

  return refreshPromise;
};

const startEventStatusJob = () => {
  if (started) return;
  started = true;

  mongoose.connection.on("disconnected", clearScheduledTransition);
  mongoose.connection.on("connected", () => {
    void refreshEventStatusSchedule().catch((error) => {
      console.error("Initial event status scheduling failed:", error.message);
    });
  });
  mongoose.connection.on("reconnected", () => {
    void refreshEventStatusSchedule().catch((error) => {
      console.error("Event status scheduling after reconnect failed:", error.message);
    });
  });

  void refreshEventStatusSchedule().catch((error) => {
    console.error("Initial event status scheduling failed:", error.message);
  });
};

export { refreshEventStatusSchedule };
export default startEventStatusJob;
